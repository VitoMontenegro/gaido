package handlers

import "testing"

func TestParseCalendarDays(t *testing.T) {
	for _, keys := range [][]string{nil, {"2027-01-32"}, {"2027-01-31", "2027-02-01"}, {"2027-01-01T10:00:00Z"}} {
		if _, err := parseCalendarDays(keys); err == nil {
			t.Fatalf("accepted %v", keys)
		}
	}
	days, err := parseCalendarDays([]string{"2027-01-02", "2027-01-02", "2027-01-03"})
	if err != nil || len(days) != 2 {
		t.Fatalf("days=%v err=%v", days, err)
	}
}
