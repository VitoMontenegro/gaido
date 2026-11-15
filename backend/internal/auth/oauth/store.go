package oauth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const txTTL = 10 * time.Minute
const onboardTTL = 30 * time.Minute

type Transaction struct {
	Provider     string `json:"provider"`
	State        string `json:"state"`
	Nonce        string `json:"nonce"`
	CodeVerifier string `json:"code_verifier"`
	ReturnURL    string `json:"return_url"`
	Intent       string `json:"intent"`
	UserID       int64  `json:"user_id,omitempty"`
	AcceptPriv   bool   `json:"accept_privacy"`
	AcceptSite   bool   `json:"accept_site_rules"`
}

type Onboarding struct {
	ID        string `json:"id"`
	Provider  string `json:"provider"`
	Issuer    string `json:"issuer"`
	Subject   string `json:"subject"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	ReturnURL string `json:"return_url"`
	AcceptPriv bool  `json:"accept_privacy"`
	AcceptSite bool  `json:"accept_site_rules"`
}

type Store struct {
	rdb *goredis.Client
}

func NewStore(rdb *goredis.Client) *Store {
	return &Store{rdb: rdb}
}

func (s *Store) available() error {
	if s == nil || s.rdb == nil {
		return errors.New("redis unavailable")
	}
	return nil
}

func (s *Store) PutTx(ctx context.Context, tx Transaction) error {
	if err := s.available(); err != nil {
		return err
	}
	b, err := json.Marshal(tx)
	if err != nil {
		return err
	}
	return s.rdb.Set(ctx, "oauth:tx:"+tx.State, b, txTTL).Err()
}

func (s *Store) ConsumeTx(ctx context.Context, state string) (*Transaction, error) {
	if err := s.available(); err != nil {
		return nil, err
	}
	key := "oauth:tx:" + state
	b, err := s.rdb.GetDel(ctx, key).Bytes()
	if err != nil {
		return nil, err
	}
	var tx Transaction
	if err := json.Unmarshal(b, &tx); err != nil {
		return nil, err
	}
	return &tx, nil
}

func (s *Store) PutOnboarding(ctx context.Context, ob Onboarding) error {
	if err := s.available(); err != nil {
		return err
	}
	b, err := json.Marshal(ob)
	if err != nil {
		return err
	}
	return s.rdb.Set(ctx, "oauth:ob:"+ob.ID, b, onboardTTL).Err()
}

func (s *Store) GetOnboarding(ctx context.Context, id string) (*Onboarding, error) {
	if err := s.available(); err != nil {
		return nil, err
	}
	b, err := s.rdb.Get(ctx, "oauth:ob:"+id).Bytes()
	if err != nil {
		return nil, err
	}
	var ob Onboarding
	if err := json.Unmarshal(b, &ob); err != nil {
		return nil, err
	}
	return &ob, nil
}

func (s *Store) DeleteOnboarding(ctx context.Context, id string) {
	if s == nil || s.rdb == nil {
		return
	}
	_ = s.rdb.Del(ctx, "oauth:ob:"+id).Err()
}

func RandomID(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
