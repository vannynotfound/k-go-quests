# K-Go Quests

An offline-first learning app for Philippine public-school tablets. Learners
practise Math, Science, English and Filipino with no signal, earn Coins for
correct answers, and get questions chosen by a Bayesian Knowledge Tracing (BKT)
model. See [`CONTEXT.md`](CONTEXT.md) for the domain glossary.

| Folder | What it is | Stack |
| --- | --- | --- |
| [`mobile/`](mobile) | The tablet app | Expo SDK 57, expo-router, React Native 0.86 |
| [`ml/`](ml) | BKT fitter and validation suite | Python 3.11, NumPy |

The previous full-stack version (NestJS backend, PostgreSQL, inference service,
teacher and admin screens) is tagged `v0-fullstack`.

## Running it

```bash
cd mobile && npm install && npx expo start     # press a for Android
cd ml && pip install -r requirements.txt && python -m pytest
```

## Notes

Khan Academy content, API and branding are not part of this repository. See
[`ml/REQUIREMENTS.md`](ml/REQUIREMENTS.md) for the per-model requirements.

`mobile/LICENSE` is the MIT license that shipped with the `create-expo-app`
template and covers that template, not this project.
