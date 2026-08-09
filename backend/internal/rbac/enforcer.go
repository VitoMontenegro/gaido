package rbac

import (
	_ "embed"
	"strings"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
)

//go:embed policy.csv
var policyCSV string

type Enforcer struct {
	e *casbin.Enforcer
}

func New() (*Enforcer, error) {
	m, err := model.NewModelFromString(`
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && regexMatch(r.act, p.act)
`)
	if err != nil {
		return nil, err
	}
	e, err := casbin.NewEnforcer(m)
	if err != nil {
		return nil, err
	}
	for _, line := range strings.Split(strings.TrimSpace(policyCSV), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Split(line, ", ")
		if len(parts) < 2 {
			continue
		}
		switch parts[0] {
		case "p":
			if len(parts) == 4 {
				_, _ = e.AddPolicy(parts[1], parts[2], parts[3])
			}
		case "g":
			if len(parts) == 3 {
				_, _ = e.AddGroupingPolicy(parts[1], parts[2])
			}
		}
	}
	return &Enforcer{e: e}, nil
}

func (en *Enforcer) Allow(role, path, method string) bool {
	ok, _ := en.e.Enforce(role, path, method)
	return ok
}

func (en *Enforcer) AllowAny(roles []string, path, method string) bool {
	for _, r := range roles {
		if en.Allow(r, path, method) {
			return true
		}
	}
	return false
}
