# 🐳 Deploy a Node.js Application on AWS EC2 Using Docker

![Docker](https://img.shields.io/badge/Docker-Containerization-2496ED?logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=nodedotjs&logoColor=white)
![AWS
EC2](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Ubuntu-E95420?logo=ubuntu&logoColor=white)

A beginner-friendly, step-by-step deployment project that demonstrates
how to containerize a Node.js application with Docker and run it on an
AWS EC2 Ubuntu instance.

------------------------------------------------------------------------

## 📌 Project Overview

In this project, you will:

1.  Create a small Node.js application using Express.
2.  Write a `Dockerfile` to package the application.
3.  Build a Docker image.
4.  Run a container from that image on an EC2 instance.
5.  Configure the EC2 security group to allow web traffic.
6.  Test the application and inspect the running container.

### Deployment architecture

``` text
                  User's web browser
                         |
                         | HTTP :80
                         v
              AWS EC2 Ubuntu Instance
                  Docker Engine
                         |
                  Host port 80
                         |
                  Docker port mapping
                         |
                         v
                Docker Container
                 Node.js + Express
                    Port 4000
                         |
                         v
                 Express application
                 /          \
                /            \
             GET /        GET /health
```

**Port mapping used in this guide:** `80:4000`

-   `80` is the port exposed on the EC2 host.
-   `4000` is the port on which the Node.js application listens inside
    the container.
-   Docker forwards traffic received on EC2 port 80 to container port
    4000.

------------------------------------------------------------------------

## 🧰 Prerequisites

Before starting, make sure you have:

-   An AWS account.
-   An Ubuntu EC2 instance (Ubuntu 22.04 or 24.04 recommended).
-   SSH access to the EC2 instance.
-   An EC2 security group that you can edit.
-   Basic familiarity with Linux terminal commands.
-   Basic understanding of Node.js and Docker.

> **Cost reminder:** EC2 instances and related AWS resources may incur
> charges. Stop or terminate resources when you no longer need them.

------------------------------------------------------------------------

## 1. Connect to your EC2 instance

From your local terminal, connect using your EC2 key pair:

``` bash
ssh -i your-key.pem ubuntu@YOUR-EC2-PUBLIC-IP
```

Replace:

-   `your-key.pem` with the path to your private key.
-   `YOUR-EC2-PUBLIC-IP` with your instance's public IPv4 address.

Update Ubuntu's package index:

``` bash
sudo apt update
```

------------------------------------------------------------------------

## 2. Create the Node.js project directory

Create a directory for the application and move into it:

``` bash
mkdir node-docker-app
cd node-docker-app
```

The project files will be stored in this directory.

------------------------------------------------------------------------

## 3. Create `package.json`

Create the Node.js package manifest:

``` bash
nano package.json
```

Add:

``` json
{
  "name": "node-docker-app",
  "version": "1.0.0",
  "description": "Node.js application running inside Docker on AWS EC2",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

Save and close the file.

### What does `package.json` do?

It stores important project information, including:

-   The application name and version.
-   The main application file.
-   Commands (scripts) used to run the application.
-   Dependencies required by the application.

Express is the web framework used to create the HTTP routes.

------------------------------------------------------------------------

## 4. Create the Node.js application

Create `server.js`:

``` bash
nano server.js
```

Add:

``` javascript
const express = require('express');

const app = express();
const PORT = 4000;

// Home route
app.get('/', (req, res) => {
    res.send('Hello! Node.js application is running inside Docker on AWS EC2.');
});

// Health-check route
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        application: 'Node.js Docker App'
    });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
```

Save and close the file.

### Understand the important parts

  -----------------------------------------------------------------------
  Code                                Purpose
  ----------------------------------- -----------------------------------
  `require('express')`                Loads the Express package.

  `express()`                         Creates an Express application.

  `app.get('/')`                      Handles HTTP GET requests to the
                                      home route.

  `app.get('/health')`                Provides a simple health-check
                                      endpoint.

  `PORT = 4000`                       Sets the application's listening
                                      port.

  `0.0.0.0`                           Makes the server listen on all
                                      container network interfaces.

  `app.listen()`                      Starts the web server.
  -----------------------------------------------------------------------

**Why use `0.0.0.0`?**

The application runs inside a container. Binding the server to `0.0.0.0`
allows it to accept connections arriving through the container's network
interface. Binding only to `127.0.0.1` inside the container can prevent
access through Docker's published port.

------------------------------------------------------------------------

## 5. Create the Dockerfile

Create a file named exactly `Dockerfile` (with no file extension):

``` bash
nano Dockerfile
```

Add the following instructions:

``` dockerfile
# 1. Use the official Node.js image as the base image
FROM node:22-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package.json into the container
COPY package*.json ./

# 4. Install production dependencies
RUN npm install --omit=dev

# 5. Copy the application source code
COPY . .

# 6. Document the application port
EXPOSE 4000

# 7. Start the Node.js application
CMD ["npm", "start"]
```

### Explanation of Dockerfile instructions

  -----------------------------------------------------------------------
  Instruction                         Explanation
  ----------------------------------- -----------------------------------
  `FROM node:22-alpine`               Uses an official Node.js 22 image
                                      based on Alpine Linux. It provides
                                      Node.js and npm without requiring a
                                      separate installation in the image.

  `WORKDIR /app`                      Creates or selects `/app` as the
                                      working directory for subsequent
                                      instructions.

  `COPY package*.json ./`             Copies the package manifest (and a
                                      lock file if one exists) into the
                                      image.

  `RUN npm install --omit=dev`        Installs the application's
                                      production dependencies while the
                                      image is being built.

  `COPY . .`                          Copies the remaining project files
                                      into the image's working directory.

  `EXPOSE 4000`                       Documents the port the application
                                      listens on. It does not publish the
                                      port to the EC2 host.

  `CMD ["npm", "start"]`              Defines the default command that
                                      runs when a container starts.
  -----------------------------------------------------------------------

### Important: `RUN` vs `CMD`

-   `RUN` executes during the **image build** process.
-   `CMD` executes when a **container starts**.

For example, `RUN npm install --omit=dev` installs dependencies into the
image. `CMD ["npm", "start"]` starts the application when you run a
container from that image.

------------------------------------------------------------------------

## 6. Create `.dockerignore`

Create a `.dockerignore` file:

``` bash
nano .dockerignore
```

Add:

``` text
node_modules
npm-debug.log
.git
.env
```

### Why use `.dockerignore`?

Docker sends the build context (the project files selected for the
build) to the Docker builder. `.dockerignore` excludes files that do not
need to be included.

-   `node_modules`: Dependencies will be installed inside the image.
-   `npm-debug.log`: Local npm debug log.
-   `.git`: Git history is not needed to run the application.
-   `.env`: Helps prevent accidentally copying local environment files
    and secrets into the image.

> Never bake passwords, API keys, or other secrets into a Docker image.
> Use an appropriate secrets-management method for real deployments.

------------------------------------------------------------------------

## 7. Install Docker on Ubuntu EC2

If Docker is not installed on the instance, install Ubuntu's Docker
package:

``` bash
sudo apt update
sudo apt install docker.io -y
```

Start the Docker service:

``` bash
sudo systemctl start docker
```

Enable Docker to start automatically when the instance boots:

``` bash
sudo systemctl enable docker
```

Check the Docker version:

``` bash
sudo docker --version
```

Check the service status:

``` bash
sudo systemctl status docker
```

You should see that the Docker service is active.

> These commands use Ubuntu's `docker.io` package. For production
> systems, consider installing Docker Engine from Docker's official
> repository so you can manage its release channel and version
> deliberately.

------------------------------------------------------------------------

## 8. Build the Docker image

Make sure you are inside the project directory:

``` bash
cd ~/node-docker-app
```

Build the image:

``` bash
sudo docker build -t nodejs-app:v1 .
```

### Understand the build command

  Part             Meaning
  ---------------- --------------------------------------------------
  `docker build`   Builds an image using the Dockerfile.
  `-t`             Assigns a name and tag to the image.
  `nodejs-app`     Image name.
  `v1`             Image tag/version.
  `.`              Uses the current directory as the build context.

The final dot (`.`) is important. It tells Docker to use the current
directory as the build context and look for the Dockerfile there by
default.

List the available images:

``` bash
sudo docker images
```

You should see an image named `nodejs-app` with the tag `v1`.

------------------------------------------------------------------------

## 9. Run the Docker container

Start a container from the image:

``` bash
sudo docker run -d \
  -p 80:4000 \
  --name node-container \
  nodejs-app:v1
```

### Explanation

  -----------------------------------------------------------------------
  Option                              Meaning
  ----------------------------------- -----------------------------------
  `docker run`                        Creates and starts a new container.

  `-d`                                Runs the container in detached mode
                                      (in the background).

  `-p 80:4000`                        Publishes EC2 host port 80 and
                                      forwards it to container port 4000.

  `--name node-container`             Assigns the container a readable
                                      name.

  `nodejs-app:v1`                     Specifies the image used to create
                                      the container.
  -----------------------------------------------------------------------

### Understand port mapping

``` text
-p HOST_PORT:CONTAINER_PORT
```

In this project:

``` text
-p 80:4000
```

``` text
Browser
   |
   | http://EC2-PUBLIC-IP:80
   v
EC2 host port 80
   |
   | Docker port forwarding
   v
Container port 4000
   |
   v
Node.js application
```

**Remember:** `EXPOSE 4000` in the Dockerfile does not publish port
4000. The `-p` option in `docker run` creates the port mapping.

------------------------------------------------------------------------

## 10. Configure the EC2 security group

Docker port mapping is not enough by itself. The EC2 security group must
also allow inbound HTTP traffic.

In the AWS Console:

1.  Open **EC2**.
2.  Select **Instances**.
3.  Select your running instance.
4.  Open the **Security** tab.
5.  Click the attached security group.
6.  Select **Edit inbound rules**.
7.  Add the following rule.

  Setting      Value
  ------------ -------------
  Type         HTTP
  Protocol     TCP
  Port range   80
  Source       `0.0.0.0/0`

Save the rules.

### Security note

This rule allows HTTP requests from anywhere on the internet. That is
acceptable for a public demonstration website. For a production
application, configure HTTPS, appropriate network restrictions, and an
application-level security strategy. Keep SSH (port 22) restricted to
your own IP address or trusted network.

------------------------------------------------------------------------

## 11. Access the application

Find the EC2 instance's **Public IPv4 address** in the AWS Console.

Open:

``` text
http://YOUR-EC2-PUBLIC-IP
```

Expected homepage response:

``` text
Hello! Node.js application is running inside Docker on AWS EC2.
```

### Test the health-check endpoint

Open:

``` text
http://YOUR-EC2-PUBLIC-IP/health
```

Expected JSON response:

``` json
{
  "status": "healthy",
  "application": "Node.js Docker App"
}
```

Replace `YOUR-EC2-PUBLIC-IP` with your actual EC2 public IP address.

------------------------------------------------------------------------

## 12. Verify the container

Run these commands on EC2 to check the deployment.

### List running containers

``` bash
sudo docker ps
```

This displays containers that are currently running.

### List all containers

``` bash
sudo docker ps -a
```

This also displays stopped and exited containers.

### View application logs

``` bash
sudo docker logs node-container
```

### Follow live logs

``` bash
sudo docker logs -f node-container
```

Press `Ctrl + C` to stop following the logs. This does not stop the
container.

### Check container resource usage

``` bash
sudo docker stats
```

This displays live CPU, memory, network, and block I/O usage.

### Test from the EC2 terminal

``` bash
curl http://localhost
```

Test the health endpoint:

``` bash
curl http://localhost/health
```

If these commands return the expected responses, the application is
reachable through the EC2 host's local port.

------------------------------------------------------------------------

## 13. Useful Docker management commands

  --------------------------------------------------------------------------
  Command                                Purpose
  -------------------------------------- -----------------------------------
  `sudo docker ps`                       List running containers.

  `sudo docker ps -a`                    List all containers.

  `sudo docker images`                   List local images.

  `sudo docker stop node-container`      Stop the container.

  `sudo docker start node-container`     Start an existing stopped
                                         container.

  `sudo docker restart node-container`   Restart the container.

  `sudo docker logs node-container`      View container logs.

  `sudo docker logs -f node-container`   Follow live logs.

  `sudo docker inspect node-container`   Display detailed container
                                         information.

  `sudo docker stats`                    Display live resource usage.

  `sudo docker rm node-container`        Remove a stopped container.

  `sudo docker rmi nodejs-app:v1`        Remove the image (when no container
                                         depends on it).
  --------------------------------------------------------------------------

### Rebuild and recreate the container after changing application code

A running container does not automatically receive changes made to the
source files on EC2. Rebuild the image and recreate the container:

``` bash
sudo docker stop node-container
sudo docker rm node-container

sudo docker build -t nodejs-app:v2 .

sudo docker run -d \
  -p 80:4000 \
  --name node-container \
  nodejs-app:v2
```

This creates a new image tagged `v2` and starts a new container from it.

------------------------------------------------------------------------

## 14. Configure the container to restart automatically

To make Docker restart the container automatically after an EC2 reboot,
use a restart policy.

Example:

``` bash
sudo docker run -d \
  --restart unless-stopped \
  -p 80:4000 \
  --name node-container \
  nodejs-app:v1
```

Restart policy:

  -----------------------------------------------------------------------
  Policy                              Behavior
  ----------------------------------- -----------------------------------
  `no`                                Do not automatically restart the
                                      container (default).

  `on-failure`                        Restart when the container exits
                                      with a non-zero exit code.

  `always`                            Always restart the container unless
                                      it has been explicitly stopped.

  `unless-stopped`                    Restart after failures or
                                      daemon/host restarts unless you
                                      explicitly stopped it.
  -----------------------------------------------------------------------

The restart policy does not make the application highly available. It
only helps Docker restart the container under the specified conditions.

------------------------------------------------------------------------

## 15. Final project structure

Your project directory should look like this:

``` text
node-docker-app/
│
├── Dockerfile
├── .dockerignore
├── package.json
└── server.js
```

------------------------------------------------------------------------

## 16. Troubleshooting

### Problem 1: Container exits immediately

Check its status:

``` bash
sudo docker ps -a
```

Check the logs:

``` bash
sudo docker logs node-container
```

Look for application errors, missing dependencies, incorrect commands,
or port conflicts.

### Problem 2: Website is not accessible

Check the following:

1.  Is the EC2 instance running?
2.  Is the Docker service active?
3.  Is the container running?
4.  Is the port mapping `80:4000` correct?
5.  Does the EC2 security group allow inbound TCP port 80?
6.  Is the application listening on `0.0.0.0:4000` inside the container?

Useful commands:

``` bash
sudo systemctl status docker
sudo docker ps
sudo docker logs node-container
sudo ss -lntp
curl http://localhost
```

### Problem 3: Port is already allocated

If another process or container is already using host port 80, Docker
may fail to publish that port.

Check listening ports:

``` bash
sudo ss -lntp
```

You can instead use another available host port, for example:

``` bash
sudo docker run -d \
  -p 8080:4000 \
  --name node-container \
  nodejs-app:v1
```

Then access:

``` text
http://YOUR-EC2-PUBLIC-IP:8080
```

Remember to allow inbound TCP port 8080 in the EC2 security group if you
use this alternative.

### Problem 4: Docker permission denied

If you see a Docker socket permission error, use `sudo` with Docker
commands:

``` bash
sudo docker ps
```

For this lab, using `sudo` is a straightforward approach. Adding a user
to the `docker` group grants highly privileged access, so do not treat
it as a harmless permission change.

------------------------------------------------------------------------

## 17. Learning outcomes

After completing this project, you should understand:

-   How to create a basic Node.js application.
-   What a Dockerfile is and how its instructions work.
-   The difference between a Docker image and a Docker container.
-   How to build an image using `docker build`.
-   How to create and run a container using `docker run`.
-   How Docker port mapping works.
-   How EC2 security groups control inbound traffic.
-   How to inspect containers, read logs, and troubleshoot basic
    deployment issues.
-   How to use Docker restart policies.

------------------------------------------------------------------------

## 18. Future improvements: Real-world DevOps workflow

After completing the manual deployment, you can extend this project into
a more realistic CI/CD workflow.

``` text
       Developer
           |
           v
      GitHub Repository
           |
           v
      GitHub Actions
           |
           v
    Build Docker Image
           |
           v
    Push Image to ECR
           |
           v
       AWS EC2
           |
           v
    Pull Latest Image
           |
           v
   Run Updated Container
```

Suggested improvements:

1.  Push the Docker image to Docker Hub.
2.  Learn Amazon Elastic Container Registry (ECR).
3.  Create a GitHub Actions pipeline to build and push images.
4.  Configure EC2 to pull and run the updated image.
5.  Add environment variables and manage secrets safely.
6.  Add HTTPS using Nginx and an SSL certificate.
7.  Explore Docker Compose when your application needs multiple
    services.

------------------------------------------------------------------------

## ✅ Task Completion Checklist

-   [ ] Created an Ubuntu EC2 instance.
-   [ ] Connected to EC2 through SSH.
-   [ ] Created the Node.js application.
-   [ ] Created `package.json`.
-   [ ] Created `server.js`.
-   [ ] Wrote the Dockerfile.
-   [ ] Created `.dockerignore`.
-   [ ] Installed and started Docker.
-   [ ] Built the Docker image.
-   [ ] Ran the Docker container.
-   [ ] Configured the EC2 security group.
-   [ ] Opened the application using the EC2 public IP.
-   [ ] Tested the `/health` endpoint.
-   [ ] Verified container status and logs.

------------------------------------------------------------------------

## 📚 Useful official documentation

-   [Docker documentation](https://docs.docker.com/)
-   [Dockerfile
    reference](https://docs.docker.com/reference/dockerfile/)
-   [Docker `run`
    command](https://docs.docker.com/reference/cli/docker/container/run/)
-   [Node.js documentation](https://nodejs.org/docs/latest/api/)
-   [Express documentation](https://expressjs.com/)
-   [Amazon EC2 documentation](https://docs.aws.amazon.com/ec2/)
-   [EC2 security
    groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)

------------------------------------------------------------------------

**Project:** Node.js Application Deployment Using Docker on AWS EC2\
**Level:** Beginner / Foundational DevOps\
**Main technologies:** Node.js, Express, Docker, Ubuntu, AWS EC2
