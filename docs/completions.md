# Shell Completions (`COMPLSH`)

`gql completions <shell>` prints a ready-to-source snippet with endpoint-aware suggestions:

```
gql completions zsh > ~/.config/gql/_gql
source ~/.config/gql/_gql
```

Supported shells: `bash`, `zsh`, `fish`.

## What gets suggested?

- Top-level commands (`help`, `init`, `render-json`, dynamically-registered endpoints, etc.)
- Endpoint subcommands (operations, renamed labels from `help.rename`, and aliases). Hidden operations remain hidden unless exposed via config; alias names still appear even when pointing at renamed operations.
- Common global flags (`--help`, `--version`) automatically surface when typing `-`.

The completion script embeds the current config + schema metadata at generation time. Re-run `gql completions <shell>` whenever endpoints or schemas change (e.g., after pulling a new config).

## Installation tips

- **bash**: `gql completions bash > ~/.gql-completions.sh` and add `source ~/.gql-completions.sh` to `.bashrc`.
- **zsh**: write the snippet to a file under your `$fpath` (e.g., `~/.zsh/completions/_gql`) and run `autoload -U compinit && compinit`.
- **fish**: `gql completions fish > ~/.config/fish/completions/gql.fish`.

The generated scripts avoid external dependencies and only rely on cached schema metadata, so regeneration usually finishes in under a second.
