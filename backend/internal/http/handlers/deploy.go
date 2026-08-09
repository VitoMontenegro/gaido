package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) AdminDeployInfo(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, r, 200, map[string]any{
		"enabled":    h.Cfg.DeployEnabled,
		"app_slug":   h.Cfg.DeployAppSlug,
		"git_branch": h.Cfg.GitBranch,
	})
}
func (h *Handlers) AdminDeployStatus(w http.ResponseWriter, r *http.Request) {
	app := r.URL.Query().Get("app")
	if app == "" || app != h.Cfg.DeployAppSlug {
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

	// Status file survives API restart (deploy kills the parent process).
	if file := h.ReadDeployStatusFile(); file != nil {
		status = file.Status
		running = file.Status == "running"
		exitCode = file.ExitCode
		if t, err := time.Parse(time.RFC3339, file.StartedAt); err == nil {
			started = t
		}
		if file.FinishedAt != nil && *file.FinishedAt != "" {
			if t, err := time.Parse(time.RFC3339, *file.FinishedAt); err == nil {
				ended = t
			}
		} else if file.Status == "running" {
			ended = time.Time{}
		}
	}

	repo := repoFromDeployScript(h.Cfg.DeployScript)
	branch, commit, commitMsg := gitHeadInfo(repo, h.Cfg.GitBranch)
	logTail := tailFile(h.Cfg.DeployLog, 80)

	var durationSec int64
	if !started.IsZero() && !ended.IsZero() {
		durationSec = int64(ended.Sub(started).Seconds())
	} else if running && !started.IsZero() {
		durationSec = int64(time.Since(started).Seconds())
	}

	readyzOK := false
	if status == "success" {
		readyzOK = h.CheckReadyzLocal()
	}

	response.JSON(w, r, 200, map[string]any{
		"status":         status,
		"running":        running,
		"app":            app,
		"enabled":        h.Cfg.DeployEnabled,
		"branch":         branch,
		"commit":         commit,
		"commit_message": commitMsg,
		"started_at":     formatTimeISO(started),
		"finished_at":    formatTimeISO(ended),
		"exit_code":      exitCode,
		"duration_sec":   durationSec,
		"log_tail":       logTail,
		"readyz_ok":      readyzOK,
	})
}
func (h *Handlers) RunDeployScript() {
	cmd := exec.Command("/bin/bash", h.Cfg.DeployScript)
	cmd.Env = append(os.Environ(),
		"DEPLOY_APP_SLUG="+h.Cfg.DeployAppSlug,
		"DEPLOY_STATUS_FILE="+h.DeployStatusPath(),
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		exitCode = 1
		if ee, ok := err.(*exec.ExitError); ok {
			exitCode = ee.ExitCode()
			if exitCode < 0 {
				exitCode = 255
			}
		}
		// If script already wrote success before deferred restart, keep success.
		if file := h.ReadDeployStatusFile(); file != nil && file.Status == "success" {
			exitCode = 0
			err = nil
		} else if h.Cfg.DeployLog != "" {
			_ = appendDeployLog(h.Cfg.DeployLog, "deploy failed: "+err.Error()+"\n"+stderr.String())
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
func (h *Handlers) DeployStatusPath() string {
	if h.Cfg.DeployLog != "" {
		return filepath.Join(filepath.Dir(h.Cfg.DeployLog), "deploy.status.json")
	}
	return "/var/www/tourister/logs/deploy.status.json"
}
func (h *Handlers) ReadDeployStatusFile() *deployStatusFile {
	data, err := os.ReadFile(h.DeployStatusPath())
	if err != nil {
		return nil
	}
	var st deployStatusFile
	if err := json.Unmarshal(data, &st); err != nil {
		return nil
	}
	if st.Status == "" {
		return nil
	}
	return &st
}
func (h *Handlers) CheckReadyzLocal() bool {
	port := strings.TrimPrefix(h.Cfg.HTTPAddr, ":")
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
