FROM postgres:latest

ENV POSTGRES_USER ucl2023
ENV POSTGRES_PASSWORD group3
ENV POSTGRES_DB movielens

COPY init.sql /docker-entrypoint-initdb.d/
COPY ssl_conf.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
