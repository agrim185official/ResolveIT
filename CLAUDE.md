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
  - **CRITICAL: The backend MUST run on port `8080`. DO NOT change this port.**
  - The application is configured to use port `8080` by default.
- **Frontend:**
  - To run: `cd "ResolveIT -Frontend" && npm start`
  - The frontend defaults to port `3000`.
  - **CRITICAL: The frontend API configuration (`src/services/api.js`) MUST point to `http://localhost:8080/api`. DO NOT change this to any other port.**

### Database
- Connection: MySQL (jdbc:mysql://localhost:3306/ResolveITDB)
- Credentials: `root` / `Agrim123@`
- Configuration is in `ResolveIT/src/main/resources/application.properties`.
