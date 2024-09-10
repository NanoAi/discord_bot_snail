Create a `.env` file and specify the following values.
```env
# Basic Settings
DEBUG_I18N=0
LANGUAGE=en

# API Keys
DISCORD_TOKEN=<your value here>
PUBLIC_KEY=<your value here>

# Discord UUIDs (Server/App)
TEST_SERVER=<your value here>
APP_ID=<your value here>

# PostgreSQL Server URL (Replace with your value.)
DATABASE_URL=postgres://username:password@127.0.0.1:5432/db
```

A quick install script for NodeJS using `scoop` ( https://scoop.sh/ ).
```
scoop install main/fnm
fnm env --use-on-cd | Out-String | Invoke-Expression
fnm use --install-if-missing 22
scoop install main/pnpm
```
