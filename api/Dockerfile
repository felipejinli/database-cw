FROM node:16

WORKDIR /app

COPY package*.json ./

RUN npm install nodemon -g

RUN npm install

COPY . .


EXPOSE 3001

CMD ["nodemon", "index.js"]
