# Inventário de Ativos API
 Esse projeto foi desenvolvido para realizar uma API de inventários ativos de cada empregado com integração ao MongoDB. 

 - Esse projeto para rodar deve ter o MongoDB e o node instalado na máquina.

## ---MongoDB---
1. Crie uma base de dados no MongoDB com o nome de inventario e a collection de ativos.
    DB = inventario Collection = ativos.

## ---Instalar Dependencias---
1. Para instalar as dependencias, primeiro execute esse código no terminal:
    npm install
2. E após isso, instale a dependecia do express, body-parser e do mongoose no terminal:
    npm install express body-parser mongoose

## ---Execute o Servidor---
- Execute o servidor com o seguinte comando no terminal:
    node server.js

## ---Teste as Rotas---
- O servidor está rodando no seguinte endereço:
    http://localhost:3000/api
- Para testar pode-se usar ferramentas como o Postman e realizar as requisições inserindo os dados.