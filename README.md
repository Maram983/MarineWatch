# MarineWatch

MarineWatch is a full-stack marine conservation platform designed to help communities report pollution, discover activities, and support environmental monitoring through a simple, role-based web application.

## Project Overview

The system brings together:

- Divers who can submit environmental reports with evidence and location details
- Volunteers who can discover and join cleanup activities
- Administrators who can review reports and track activity outcomes
- A map-based interface to visualize environmental hotspots and monitoring activity

## Core Features

- Role-based interfaces for diver, volunteer, and admin users
- Pollution report submission with image evidence and location metadata
- Interactive marine map and hotspot visualization
- Activity listing and participation workflow
- Admin dashboard for report review and operational oversight
- Responsive frontend for desktop and mobile browsing

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap
- Backend: Node.js, Express
- Database/Auth: Supabase
- Mapping: Leaflet

## Project Structure

- backend/ — Express API, routes, controllers, models, and Supabase integration
- frontend/ — static web frontend and UI pages
- screenshots/ — project visuals for documentation and portfolio use
- LICENSE — project license

## Setup

1. Navigate to backend/ and install dependencies:
   npm install
2. Create a local .env file based on backend/.env.example and add your own non-sensitive configuration values.
3. Start the backend server:
   npm start
4. Open the frontend in a browser or serve it through the project’s local static pages.

## Notes

This repository intentionally excludes local environment variables, API keys, credentials, and real user data. Configuration values should be supplied locally in a secure .env file that is not committed to source control.

## Portfolio Summary

This project demonstrates practical full-stack web development, REST API integration, database-backed workflows, and user-centric design in a real-world environmental application context.
