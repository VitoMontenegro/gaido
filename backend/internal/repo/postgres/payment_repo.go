package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type PaymentRepo struct{ db *DB }

func NewPaymentRepo(db *DB) *PaymentRepo { return &PaymentRepo{db: db} }

func (r *PaymentRepo) Create(ctx context.Context, payerID int64, purpose string, amount float64, currency string, metadata map[string]any) (int64, error) {
	var id int64
	providerID := fmt.Sprintf("stub-%d-%d", payerID, time.Now().UnixNano())
	metaJSON, _ := json.Marshal(metadata)
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO payments (payer_id, payer_type, purpose, amount, currency, status, provider_payment_id, metadata)
		VALUES ($1,'GUIDE',$2,$3,$4,$5,$6,$7) RETURNING id
	`, payerID, purpose, amount, currency, domain.PaymentPending, providerID, metaJSON).Scan(&id)
	return id, err
}

func (r *PaymentRepo) GetByID(ctx context.Context, id int64) (*domain.Payment, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, payer_id, payer_type, purpose, amount, currency, status, provider_payment_id, metadata
		FROM payments WHERE id=$1`, id)
	var p domain.Payment
	var metaJSON []byte
	err := row.Scan(&p.ID, &p.PayerID, &p.PayerType, &p.Purpose, &p.Amount, &p.Currency, &p.Status, &p.ProviderPaymentID, &metaJSON)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(metaJSON) > 0 {
		_ = json.Unmarshal(metaJSON, &p.Metadata)
	}
	return &p, nil
}

func (r *PaymentRepo) MarkPaid(ctx context.Context, id int64) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE payments SET status=$2, updated_at=NOW() WHERE id=$1 AND status != $3`, id, domain.PaymentPaid, domain.PaymentPaid)
	return err
}
