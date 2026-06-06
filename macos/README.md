# macOS Setup

Run from the repository root:

```sh
./macos/setup.sh
```

## Automated

- Apply macOS defaults from `osx_settings.sh`
- Install Homebrew if missing
- Install Homebrew packages from `Brewfile`
- Authenticate GitHub CLI
- Install npm packages from `npm.sh`
- Stow dotfiles via `../stowables/setup.sh`
- Install tmux terminfo
- Link `.env` from iCloud Drive

## Manual

- Install Docker
- Enable three finger drag
- Configure Alfred:
  - unmap `cmd+space` from Spotlight
  - map `cmd+space` to Alfred
