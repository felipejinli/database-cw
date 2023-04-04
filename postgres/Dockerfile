FROM postgres:latest

RUN apt-get update && \
	apt-get install -y --no-install-recommends \
	ca-certificates \
	curl \
	gnupg && \
	curl https://install.citusdata.com/community/deb.sh | bash && \
	apt-get install -y --no-install-recommends \
	postgresql-15-citus-10.2 && \
	apt-get purge -y --auto-remove \
	ca-certificates \
	curl \
	gnupg

ENV POSTGRES_USER ucl2023
ENV POSTGRES_PASSWORD group3
ENV POSTGRES_DB movielens

COPY init.sql /docker-entrypoint-initdb.d/
COPY ssl_conf.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
