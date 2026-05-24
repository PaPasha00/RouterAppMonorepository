# Пуш в GitHub

Монорепо: remote `monorepo` → RouterAppMonorepository, `develop` → route-safety-planner (если настроены).

## Обычный пуш

```bash
cd /path/to/RouterApp
git add -A
git commit -m "описание"
git push monorepo main
```

## gh

```bash
gh auth login
git push monorepo main
```

## Токен

```bash
git push https://<TOKEN>@github.com/PaPasha00/RouterAppMonorepository.git main
```

Токен: GitHub → Settings → Developer settings → Personal access tokens.

## SSH

```bash
git push git@github.com:PaPasha00/RouterAppMonorepository.git main
```

`.env` и секреты в коммит не класть.

## После пуша

Проверить на GitHub, что `be/`, `mobileApp/`, `fe/` на месте. README в корне `route-safety-app`.
