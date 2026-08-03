CREATE INDEX idx_users_sanction_expiry
    ON users(status, sanctioned_until);
