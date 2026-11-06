package impersonate

import "context"

type State struct {
	ActorID   int64
	GuideID   int64
	GuideName string
}

type ctxKey struct{}

func With(ctx context.Context, actorID, guideID int64, guideName string) context.Context {
	if actorID == 0 || guideID == 0 {
		return ctx
	}
	return context.WithValue(ctx, ctxKey{}, State{
		ActorID:   actorID,
		GuideID:   guideID,
		GuideName: guideName,
	})
}

func FromContext(ctx context.Context) *State {
	v, ok := ctx.Value(ctxKey{}).(State)
	if !ok || v.ActorID == 0 {
		return nil
	}
	return &v
}
