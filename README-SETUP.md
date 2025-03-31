# Setting Up Pseudo with APICenter

This document explains how to set up Pseudo to work with APICenter using Poetry's path dependencies.

## Directory Structure

The recommended directory structure is:

```
parent_directory/
├── apicenter/           # APICenter repository
└── pseudo/              # Pseudo repository
```

This structure allows Pseudo to reference APICenter using a relative path in the Poetry configuration.

## Setup Steps

1. **Clone both repositories in the same parent directory**

   ```bash
   mkdir ai-projects
   cd ai-projects
   git clone https://github.com/user/apicenter.git
   git clone https://github.com/user/pseudo.git
   ```

2. **Configure Poetry dependencies**

   Pseudo's `pyproject.toml` is already configured to use APICenter from a relative path:

   ```toml
   [tool.poetry.dependencies]
   # ...other dependencies...
   
   # Use APICenter from relative local path in editable mode
   apicenter = { path = "../apicenter", develop = true }
   ```

   The `develop = true` setting ensures that APICenter is installed in editable mode, allowing you to make changes to either codebase without reinstalling.

3. **Install dependencies with Poetry**

   ```bash
   cd pseudo
   poetry install
   ```

4. **Run Pseudo**

   ```bash
   poetry run python -m pseudo.core.app
   ```

   Or use the shortcut command:

   ```bash
   poetry run pseudo
   ```

## Troubleshooting

If you encounter issues with the dependency:

1. **Check directory structure**
   
   Ensure that `apicenter` and `pseudo` are in the same parent directory.

2. **Verify Poetry configuration**
   
   Make sure the `path` in `pyproject.toml` correctly points to the APICenter directory.

3. **Update dependencies**
   
   If you've made changes to either codebase:

   ```bash
   poetry update
   ```

4. **Reinstall dependencies**
   
   As a last resort, you can reinstall all dependencies:

   ```bash
   poetry install --force
   ```

## Working on Both Codebases

Because APICenter is installed in develop mode, any changes to either codebase will immediately be reflected without needing to reinstall. This makes it easy to work on both projects simultaneously. 