/** @type {import('@commitlint/types').UserConfig} */
const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "impr",
        "fix",
        "docs",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "style",
        "chore",
        "revert",
      ],
    ],
  },
  prompt: {
    questions: {
      type: {
        description: "Select the type of change that you're committing",
        enum: {
          feat: {
            description: "A new feature",
            title: "Features",
            emoji: "✨",
          },
          impr: {
            description: "An improvement to an existing feature",
            title: "Improvements",
            emoji: "🛠",
          },
          fix: {
            description: "A bug fix",
            title: "Bug Fixes",
            emoji: "🐛",
          },
          docs: {
            description: "Documentation only changes",
            title: "Documentation",
            emoji: "📚",
          },
          style: {
            description:
              "Changes that do not affect the meaning of the code (white space, formatting, missing semi-colons, etc)",
            title: "Code Style",
            emoji: "🎨",
          },
          refactor: {
            description:
              "A code change that neither fixes a bug nor adds a feature, but makes the code easier to read, understand, or improve",
            title: "Refactoring",
            emoji: "🔧",
          },
          perf: {
            description: "A code change that improves performance",
            title: "Performance",
            emoji: "⚡",
          },
          test: {
            description: "Adding missing tests or correcting existing tests",
            title: "Tests",
            emoji: "🧪",
          },
          build: {
            description:
              "Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)",
            title: "Build System",
            emoji: "📦",
          },
          ci: {
            description:
              "Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)",
            title: "CI",
            emoji: "🤖",
          },
          chore: {
            description: "Other changes that don't apply to any of the above",
            title: "Chores",
            emoji: "🔩",
          },
          revert: {
            description: "Reverts a previous commit",
            title: "Reverts",
            emoji: "⏪",
          },
        },
      },
    },
  },
  helpUrl:
    "https://github.com/iwmywn/personal-finance-app/blob/master/commitlint.config.mjs",
}

export default commitlintConfig
