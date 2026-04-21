package repository

import (
	"database/sql"
	"elearn-backend/internal/models"
	"errors"
	"time"
)

var ErrNotFound = errors.New("record not found")

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(email, passwordHash, name, role string) (*models.User, error) {
	result, err := r.db.Exec(
		"INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
		email, passwordHash, name, role,
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return r.FindByID(id)
}

func (r *UserRepository) FindByID(id int64) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(
		"SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE id = ?",
		id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(
		"SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = ?",
		email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	_, err := r.db.Exec(
		"UPDATE users SET email = ?, name = ?, role = ?, updated_at = ? WHERE id = ?",
		user.Email, user.Name, user.Role, time.Now(), user.ID,
	)
	return err
}

func (r *UserRepository) Delete(id int64) error {
	_, err := r.db.Exec("DELETE FROM users WHERE id = ?", id)
	return err
}

func (r *UserRepository) ListAll(roleFilter string, offset, limit int) ([]models.User, int, error) {
	query := "SELECT id, email, name, role, created_at, updated_at FROM users"
	var args []interface{}
	countQuery := "SELECT COUNT(*) FROM users"

	if roleFilter != "" {
		query += " WHERE role = ?"
		countQuery += " WHERE role = ?"
		args = append(args, roleFilter)
	}

	var total int
	err := r.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, nil
}

func (r *UserRepository) CountByRole(role string) (int, error) {
	var count int
	query := "SELECT COUNT(*) FROM users"
	var args []interface{}
	if role != "" {
		query += " WHERE role = ?"
		args = append(args, role)
	}
	err := r.db.QueryRow(query, args...).Scan(&count)
	return count, err
}

func (r *UserRepository) SetRefreshTokenHash(userID int64, tokenHash string) error {
	result, err := r.db.Exec(
		"UPDATE users SET refresh_token_hash = ?, updated_at = ? WHERE id = ?",
		tokenHash, time.Now(), userID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *UserRepository) GetRefreshTokenHash(userID int64) (string, error) {
	var tokenHash sql.NullString
	err := r.db.QueryRow("SELECT refresh_token_hash FROM users WHERE id = ?", userID).Scan(&tokenHash)
	if err == sql.ErrNoRows {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	if !tokenHash.Valid {
		return "", nil
	}

	return tokenHash.String, nil
}

func (r *UserRepository) ClearRefreshTokenHash(userID int64) error {
	result, err := r.db.Exec(
		"UPDATE users SET refresh_token_hash = NULL, updated_at = ? WHERE id = ?",
		time.Now(), userID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	return nil
}
