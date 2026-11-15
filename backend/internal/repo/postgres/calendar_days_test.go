package postgres

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgconn"
	"strings"
	"testing"
	"time"
)

type calendarTxStub struct {
	calls      int
	failAt     int
	committed  bool
	rolledBack bool
	sql        []string
}

func (tx *calendarTxStub) Exec(_ context.Context, sql string, _ ...any) (pgconn.CommandTag, error) {
	tx.calls++
	tx.sql = append(tx.sql, sql)
	if tx.calls == tx.failAt {
		return pgconn.CommandTag{}, errors.New("write failed")
	}
	return pgconn.CommandTag{}, nil
}
func (tx *calendarTxStub) Commit(context.Context) error   { tx.committed = true; return nil }
func (tx *calendarTxStub) Rollback(context.Context) error { tx.rolledBack = true; return nil }
func TestMonthChangesCommitTogetherOrRollback(t *testing.T) {
	days := []time.Time{time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC), time.Date(2027, 1, 2, 0, 0, 0, 0, time.UTC)}
	for _, excursionID := range []int64{0, 7} {
		for _, selected := range []bool{true, false} {
			failed := &calendarTxStub{failAt: 2}
			if err := setCalendarDays(context.Background(), failed, 3, excursionID, days, selected, 180); err == nil || failed.committed || !failed.rolledBack {
				t.Fatal("partial update was committed")
			}
			ok := &calendarTxStub{}
			if err := setCalendarDays(context.Background(), ok, 3, excursionID, days, selected, 180); err != nil || !ok.committed || ok.calls != 2 {
				t.Fatal("month was not committed")
			}
			if selected && !strings.Contains(ok.sql[0], "WHERE NOT EXISTS") {
				t.Fatal("retries must not add duplicate days")
			}
			if !selected && !strings.HasPrefix(ok.sql[0], "DELETE") {
				t.Fatal("remove must retain its explicit intent")
			}
		}
	}
}
