# How to contribute to @Cadia#5418

You should always make a new branch on the github repo (<https://github.com/DevArqf/Cadia-Development>) when adding a new feature and you should follow a naming scheme for the branch.

The naming scheme should be:

- `feature/featureName` for new features
- `bugfix/bugName` for bug fixes
- `enhancement/enhancementName` for enhancements

When you are done with your feature, bug fix, or enhancement, you should make a pull request to the `main` branch.

**You should always branch from the `main` branch and not from any other branch.**

After you make a pull request, you should wait for a review from the maintainers of the repo. If the maintainers approve your pull request, it will be merged into the `main` branch and your changes will be live on the bot.

If the maintainers do not approve your pull request, they will leave a comment on the pull request with what you need to fix. You should fix the issues and then make a new commit to the branch. After you make a new commit, the maintainers will review your pull request again.

### How do i make a branch?

This part assumes you are using vscode.

Vscode makes it really easy to make a new branch using the built in git features. You can check your activity bar (the bar on the left with all the icons) and search for a git icon. Click on the git icon and you should be in the source control tab.

Then you can click the 3 dots on the top right of the source control tab and click on `Branch` > `Create Branch From...` and then select `main` on the menu that pops up. You can then name your branch and click enter.

### How to do local testing

To do local testing, you should use a seperate bot token for your local bot. You should NOT use the bot token for the main bot for local testing (only Malik/arqf is allowed to do so). You can get a bot token from the Discord Developer Portal (<https://discord.com/developers/applications>).

The bot token should be put in a `.env` file in the root of the project. The `.env` file should look the one named `.env.example` in the root of the project. You should replace `TOKEN` and `DATABASE_URL` with your bot token and your MySQL/MariaDB connection URL.

Make sure to .gitignore the .env file so that it is not uploaded to the github repo.

### How to push to prod

To push to prod, you should make a pull request to the `main` branch. After the pull request is approved, it will be merged into the `main` branch and your changes will be live on the bot.

You dont need to push your `.env` file as there will already be an existing one on the server.
