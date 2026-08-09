package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

var (
	deployMu      sync.Mutex
	deployRunning bool
	deployStatus  = "idle"
	deployApp     string
	deployStarted time.Time
	deployEnded   time.Time
	deployExit    int
)

type deployStartRequest struct {
	Confirm string `json:"confirm"`
	App     string `json:"app"`
}

func (a *App) adminDeployInfo(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, r, 200, map[string]any{
		"enabled":    a.cfg.DeployEnabled,
		"app_slug":   a.cfg.DeployAppSlug,
		"git_branch": a.cfg.GitBranch,
	})
}

func (a *App) adminStartDeploy(w http.ResponseWriter, r *http.Request) {
	if !a.cfg.DeployEnabled {
		response.Error(w, r, apperrors.New("DEPLOY_DISABLED", "Deploy is disabled on this server", 503))
		return
	}
	if a.cfg.DeployScript == "" {
		response.Error(w, r, apperrors.New("DEPLOY_MISCONFIGURED", "DEPLOY_SCRIPT is not set", 503))
		return
	}

	var req deployStartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.Confirm != "DEPLOY" {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "confirm must be DEPLOY", 400))
		return
	}
	if req.App == "" || req.App != a.cfg.DeployAppSlug {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}

	deployMu.Lock()
	if deployRunning {
		deployMu.Unlock()
		response.Error(w, r, apperrors.New("DEPLOY_IN_PROGRESS", "Deploy already running", 409))
		return
	}
	deployRunning = true
	deployStatus = "running"
	deployApp = req.App
	deployStarted = time.Now().UTC()
	deployEnded = time.Time{}
	deployExit = -1
	deployMu.Unlock()

	go a.runDeployScript()

	response.JSON(w, r, 202, map[string]any{
		"status":  "running",
		"app":     req.App,
		"message": "Deploy started",
	})
}

func (a *App) adminDeployStatus(w http.ResponseWriter, r *http.Request) {
	app := r.URL.Query().Get("app")
	if app == "" || app != a.cfg.DeployAppSlug {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}

	deployMu.Lock()
	running := deployRunning
	status := deployStatus
	started := deployStarted
	ended := deployEnded
	exitCode := deployExit
	deployMu.Unlock()

	repo := repoFromDeployScript(a.cfg.DeployScript)
	branch, commit, commitMsg := gitHeadInfo(repo, a.cfg.GitBranch)
	logTail := tailFile(a.cfg.DeployLog, 80)

	var durationSec int64
	if !started.IsZero() && !ended.IsZero() {
		durationSec = int64(ended.Sub(started).Seconds())
	} else if running && !started.IsZero() {
		durationSec = int64(time.Since(started).Seconds())
	}

	readyzOK := false
	if status == "success" {
		readyzOK = a.checkReadyzLocal()
	}

	response.JSON(w, r, 200, map[string]any{
		"status":          status,
		"running":         running,
		"app":             app,
		"enabled":         a.cfg.DeployEnabled,
		"branch":          branch,
		"commit":          commit,
		"commit_message":  commitMsg,
		"started_at":      formatTimeISO(started),
		"finished_at":     formatTimeISO(ended),
		"exit_code":       exitCode,
		"duration_sec":    durationSec,
		"log_tail":        logTail,
		"readyz_ok":       readyzOK,
	})
}

func (a *App) runDeployScript() {
	cmd := exec.Command("/bin/bash", a.cfg.DeployScript)
	cmd.Env = os.Environ()

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		exitCode = 1
		if ee, ok := err.(*exec.ExitError); ok {
			exitCode = ee.ExitCode()
		}
		if a.cfg.DeployLog != "" {
			_ = appendDeployLog(a.cfg.DeployLog, "deploy failed: "+err.Error()+"\n"+stderr.String())
		}
	}

	deployMu.Lock()
	deployRunning = false
	deployEnded = time.Now().UTC()
	deployExit = exitCode
	if exitCode == 0 {
		deployStatus = "success"
	} else {
		deployStatus = "failed"
	}
	deployMu.Unlock()
}

func repoFromDeployScript(script string) string {
	if script == "" {
		return ""
	}
	// .../repo/deploy/deploy.sh → .../repo
	return filepath.Clean(filepath.Join(filepath.Dir(script), ".."))
}

func gitHeadInfo(repo, fallbackBranch string) (branch, commit, message string) {
	if repo == "" {
		return fallbackBranch, "", ""
	}
	if _, err := os.Stat(filepath.Join(repo, ".git")); err != nil {
		return fallbackBranch, "", ""
	}
	branch = strings.TrimSpace(runGit(repo, "rev-parse", "--abbrev-ref", "HEAD"))
	if branch == "" || branch == "HEAD" {
		branch = fallbackBranch
	}
	commit = strings.TrimSpace(runGit(repo, "rev-parse", "--short", "HEAD"))
	message = strings.TrimSpace(runGit(repo, "log", "-1", "--pretty=%s"))
	return branch, commit, message
}

func runGit(dir string, args ...string) string {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return string(out)
}

func tailFile(path string, maxLines int) string {
	if path == "" {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	lines := strings.Split(string(data), "\n")
	if len(lines) > maxLines {
		lines = lines[len(lines)-maxLines:]
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func appendDeployLog(path, msg string) error {
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = f.WriteString(msg)
	return err
}

func formatTimeISO(t time.Time) any {
	if t.IsZero() {
		return nil
	}
	return t.Format(time.RFC3339)
}

func (a *App) checkReadyzLocal() bool {
	port := strings.TrimPrefix(a.cfg.HTTPAddr, ":")
	if port == "" {
		port = "8081"
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/readyz")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}
