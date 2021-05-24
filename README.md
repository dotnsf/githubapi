# GitHub API

## Overview

Sample for GitHub OAuth API.


## Pre-requisites

- Create Github account

- Create a repository which is supposed to be handled by this application.

  - Create repository.

  - Make main branch name as **"main"**.

  - Add, commit, and push at least one file into this **main** branch.

- If you want to make this repository to be used by another GitHub user, you need to add him/her as Collaborator in this repository.


## Setup

- Sign-in to GitHub : https://github.com/

- Navigate from upper-right menu: Settings - Developer settings - OAuth Apps - New GitHub App

- Input App name, Homepage URL(`http://localhost:8080` for example), Callback URL(`http://localhost:8080/api/callback` for example), and click **Create GitHub App** button. 

- Copy `client_id`, (generated)`client_secret`, and `callback_url`, then paste them into settings.js.

- Edit `repo_name` in settings.js. This value is supposed to be a same name of repository which is created in above.

  - If your Github username is `USER` and repository name is `REPO`, then this value should be set as **`USER/REPO`**.

- Edit `target_branch_name` in settings.js, if needed. This value is a branch name of repository which is supposed to be created in initial setup and to be merged into.


## How to run

- Install Node.js

  - https://nodejs.org/

- Git clone or Download this code:

  - `$ git clone https://github.com/dotnsf/githubapi`

  - `$ cd githubapi`

- Install dependant libraries:

  - `$ npm install`

- Run application:

  - `$ node app`

- Browse application with web browser:

  - http://localhost:8080/


## GitHub OAuth API References

https://docs.github.com/en/developers/apps/building-oauth-apps


## GitHub REST API References

https://docs.github.com/en/rest


## References

https://qiita.com/ngs/items/34e51186a485c705ffdb


## Licensing

This code islicensed under MIT.


## Copyright

2021 K.Kimura @ Juge.Me all rights reserved.
