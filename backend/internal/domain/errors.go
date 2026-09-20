package domain

import "errors"

var ErrInvalidMaxGuests = errors.New("invalid max_guests")
var ErrGuideAboutTooLong = errors.New("about must be at most 1000 characters")
