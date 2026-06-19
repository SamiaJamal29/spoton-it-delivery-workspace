-- Demo accounts (password: SpotOn@2025, hashed with PBKDF2-SHA256 100k iterations)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES
  ('432f4ad8-8ea1-44a5-b113-21b1a4119c23', 'Sarah PM', 'sarah.pm@spoton.test', 'pbkdf2:sha256:100000:9802ba81f8f5abd1832f22f8c85b5a95:258257a1e4006d2a720e2d6dbf8b5759e30d53c3f13dfcd505d67c0d86d32cea', 'Project Manager'),
  ('8a5d5737-78dc-45e1-b6b5-9c66c7a40231', 'Alex Dev', 'alex.dev@spoton.test', 'pbkdf2:sha256:100000:9647a07865739e69f0dbb0f38988c983:5f746469f2bb9276e88d3971eb538e10bc6df9babb037dc15fa5c3c689b26ae6', 'Member'),
  ('c7ad2fee-ed89-49ee-a17a-8a6b32304abe', 'PM User', 'pm@spoton.test', 'pbkdf2:sha256:100000:ff1913b018e4029d97d884c9bee08a10:26d426628bb9185e6673b6f30bbee873f3197223dca4ea934e05e1d2e5ca1a01', 'Project Manager'),
  ('bfecf525-7a6d-4d38-be71-b21696d82635', 'Ahmed', 'ahmed@spoton.test', 'pbkdf2:sha256:100000:b3a274be2564dbfdc1cf4d797e9ba379:69e1de93cf5fc08153da6894ef0793e375674c94cada7e6b19c70ac944051db6', 'Member');
