# Healther PY

This is an application that has a backend and a frontend service.
The goal of the application is to track the state and the health of
other service. The key is that it has to be as stable as possible.

Users can login and ask to track a service.

In case the service do not responde correctly, the Healther service
will send an email to the list of user that have to be informed of the 
down time.

Users can have multiple workspace, in workspaces multiple users can work
(like CRUD operations on service watchers).

Users who own workspaces can invite other users to join his workspace
and be an observer or admin of health events.

Every workspace can have a public page where anyone on the internet can see
the health of the service in the last 90 days.

Users have their profile, a name, sur name, pronouns, city, social links like
github, linkedin or their website, a Bio, a profile picture.


## About API

It is a python language service, with FastAPI as framework. Using Pydantic as
data transfer object.

Here lies all the connection of the service. Here lies the CRUD operations
that goes to the databases.

It is the main engine of the whole application, it's the core of the whole service
it sends requests to the desired service to watch and then when the response
is correct (as the user defined) it will be marked as healthy. User can define
the length of the period to wait between a request and the next one. Let the user
set minutes, hours, days, weeks. And also the number, like every 15 mins should be
the default setting.

Also as soon as a response is not correct, there will be an emailing service to send
a message to inform the subscribed users of the down time. 

## Database

We need a storage system, we can use Redis for queue of email sending, request that
has to be sent every moment.
I would also add a postgres database to store the results of every event. 

## Auth system

There must be also the authentication and authorization system. 
  - Workspace owner can do anything
  - Workspace admin can create, delete service watcher
  - Workspace observer can look what is going on
  - Public can only view the status page of the workspace

Add authorization as you need and keep track of them in a document.

## About frontend

This has to be as fast, reliable, I would choose React, JS, design has to be
as modern as possible, look for 2026 web design trends online. Choose the pantone
color of the year as main accent, and create the correct pleasent palet to match it.

- A landing page to present the service.
- A login page / register (also let the user choose to login/register with github)
- Dashboard for authenticated user where he can create workspaces. See how many
  workspaces he has, how many watcher he has active. And so on.
- A workspace page, where there is a list of service to watch and a detailed list
  of settings, the expected response, who has to be informed of the downtime.
  There has to be a dashboard for every workspace where the user can see
  at a glance the state of all the services watching. A percentage of up time
  in the last 90 days. The list of all the services with small vertical pipes,
  meaning a day. Color mean how was the day. Full green is 100% healthy. Yellow
  between 100 and 95%, orange less then 95 and more than 50, red is less then 50.
  User can open the row item that expands the vertical pipes and show the graph.
  A graph with latency per time for every service. There is also a button
  where the user can edit the service entry watch. Editing only period and saving
  persistence. 
  - Invite a user to join the workspace (even if the new user do not have an account).
    - Also remove a user
    - Promote a user to admin of the workspace so he can create watchers too.
- Settings page
  - Let the user choose for system, light or dark mode.
  - Change his name, surname, pronouns, bio and social links.
  - If his page can pe public, only authenticated, workspace users shared.
  - Photo profile

Can also edit the list of user who need to be informed if something
goes down.

## Test

Create tests for backend and frontend services.
Add the github action to test those.

## Docker compose

Create the docker-compose.yml to start the system.

## Watcher

It's the service that sends requests and receive the response, check the result
and then send to the API the list of results.
