# Node.js with React Tutorial: Single Sign-On (SSO) with Ping Identity

This project demonstrates Single Sign-On (SSO) authentication using **Ping Identity**. 
It includes a **React.js frontend** for the login page and a **Node.js backend** for handling authentication requests.

##  Project Overview

- **Frontend**: Built with React.js, running on **port 3000**.
- **Backend**: Built with Node.js, running on **port 3001**.

##  Setup Instructions

### **Clone the Repository**
```sh
git clone https://github.com/ScaleupInfra/scalekit-examples-ping-indentity.git
cd scalekit-examples-ping-indentity
```
### **Follow these steps to set up and run the backend server:**
###  1. Navigate to the backend directory:
```sh
cd backend
```
### 2. Install dependencies:
```sh
npm i
```
### 3. Create a .env file in the backend directory:
```sh
touch .env
```
### 4. Add the following environment variables to .env:
```sh
SCALEKIT_ENVIRONMENT_URL=
SCALEKIT_CLIENT_ID=
SCALEKIT_CLIENT_SECRET=
```
### 5. Start the backend server:
```sh
npm start
```
### **Follow these steps to set up and run the frontend Setup (React.js)**
###  1. Navigate to the Frontend directory:
```sh
cd frontend
```
### 2. Install dependencies:
```sh
npm i
```
### 3. Start the Frontendserver:
```sh
npm start
```
### **Running the Project**
Once both the frontend and backend are running:

1. Open http://localhost:3000 in your browser.
2. Click on Social Login or Enterprise SAML.
3. You'll be redirected to Ping Identity for authentication.

