# postgres/Dockerfile
FROM postgres:14

ENV POSTGRES_USER ucl2023
ENV POSTGRES_PASSWORD group3
ENV POSTGRES_DB movielens

COPY init.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
