ALTER     SYSTEM
SET       ssl = 'on';

ALTER     SYSTEM
SET       ssl_cert_file = '/var/lib/postgresql/certs/server.crt';

ALTER     SYSTEM
SET       ssl_key_file = '/var/lib/postgresql/certs/server.key';