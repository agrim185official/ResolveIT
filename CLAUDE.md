# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a full-stack application consisting of:
- **Backend:** Spring Boot (Java 17, Maven)
- **Frontend:** React (npm, `react-scripts`)
- **Database:** MySQL

### Project Structure
- `/ResolveIT`: Backend source code.
- `/ResolveIT -Frontend`: Frontend source code.

## Development Tasks

### Building and Running
- **Backend:** 
  - To run: `cd ResolveIT && ./mvnw spring-boot:run`
  - The application defaults to port `8080`.
- **Frontend:**
  - To run: `cd "ResolveIT -Frontend" && npm start`
  - To run on a specific port (if 3000 is occupied): `PORT=XXXX npm start`

### Database
- Connection: MySQL (jdbc:mysql://localhost:3306/ResolveITDB)
- Credentials: `root` / `Agrim123@`
- Configuration is in `ResolveIT/src/main/resources/application.properties`.
