export type Locale = 'ru' | 'en'

export type Copy = {
  title: string
  subtitle: (n: number) => string
  playLive: string
  playPractice: string
  helpButton: string
  subtitleLive: (n: number) => string
  subtitlePractice: (n: number) => string
  modeLiveBadge: string
  modePracticeBadge: string
  /** До смены общего слова (live) */
  liveRoundCountdownLabel: string
  newGameLive: string
  newGamePractice: string
  languageLabel: string
  lettersLabel: string
  themeLabel: string
  themeDark: string
  themeLight: string
  langRu: string
  langEn: string
  lettersN: (n: number) => string
  boardAria: string
  keyboardAria: string
  enterWordLength: (n: number) => string
  notInDictionary: string
  alreadyUsed: string
  hintPlaying: string
  won: (word: string) => string
  lost: (word: string) => string
  enterKey: string
  backspaceKey: string
  changeSettings: string
  /** Кнопка выхода из экрана игры в настройки */
  exitGameScreen: string
  exitGameConfirmTitle: string
  exitGameConfirmHint: string
  exitGameConfirmStay: string
  exitGameConfirmLeave: string
  loadingGame: string
  loadFailed: string
  retryLoad: string
  adminLink: string
  suggestWord: string
  suggestSent: string
  suggestDuplicate: string
  suggestError: (code: string) => string
  adminTitle: string
  adminLoginUser: string
  adminLoginPass: string
  adminLoginSubmit: string
  adminLoginError: string
  adminNotConfigured: string
  adminLogout: string
  adminEmptyList: string
  adminWord: string
  adminLang: string
  adminSuggestedAt: string
  adminApprove: string
  adminDismiss: string
  adminBackToGame: string
  /** Ссылка на главный экран из админки */
  adminHome: string
  adminLoadError: string
  adminChangePasswordTitle: string
  adminCurrentPassword: string
  adminNewPassword: string
  adminChangePasswordSubmit: string
  adminPasswordChangeSuccess: string
  adminWrongCurrentPassword: string
  adminBadNewPassword: string
  adminPasswordChangeGenericError: string
  adminSuggestionsTabsLabel: string
  adminEmptyListForLang: string
  adminConsoleMainTabsLabel: string
  adminTabSuggestions: string
  adminTabImport: string
  adminTabDictionary: string
  adminDictionarySectionLabel: string
  adminDictionaryLengthTabsLabel: string
  adminDictionaryPrev: string
  adminDictionaryNext: string
  adminDictionaryRangePage: (
    from: number,
    to: number,
    total: number,
    page: number,
    totalPages: number,
  ) => string
  adminDictionaryPaginationAria: string
  adminDictionaryLettersAria: string
  adminDictionaryAllLetters: string
  adminDictionarySearchLabel: string
  adminDictionarySearchPlaceholder: string
  adminDictionarySearchSubmit: string
  adminDictionarySearchClear: string
  adminDictionarySearchAria: string
  adminDictionaryEmpty: string
  adminDictionaryNoMatches: string
  adminDictionaryEdit: string
  adminDictionarySave: string
  adminDictionaryCancel: string
  adminDictionaryDelete: string
  adminDictionaryNewWordLabel: string
  adminDictionaryErrorConflict: string
  adminDictionaryErrorNotFound: string
  adminDictionaryErrorBadLength: string
  adminDictionaryErrorGeneric: string
  adminImportHint: string
  adminImportLangLabel: string
  adminImportTextLabel: string
  adminImportPlaceholder: string
  adminImportFileButton: string
  adminImportFileHint: string
  adminImportSubmit: string
  adminImportSubmitting: string
  adminImportResultTitle: string
  adminImportAddedTitle: (n: number) => string
  adminImportAlreadyTitle: (n: number) => string
  adminImportInvalidTitle: (n: number) => string
  adminImportNoReportYet: string
  adminImportTooManyLines: (max: number) => string
  adminImportGenericError: string
  adminImportSourceDictionary: string
  adminImportSourceSuggested: string
  adminImportSourceDismissed: string
  adminImportSourceUnknown: string
  adminImportReasonEmpty: string
  adminImportReasonBadLength: string
  adminImportReasonBadLine: string
  adminImportReasonInsertFailed: string
  /** Свернуть панель настроек в админке */
  adminCloseSettingsPanel: string
  adminEncryptionMissing: string
  adminFirstRunTitle: string
  adminFirstRunHint: string
  adminPasswordAgain: string
  adminRegisterSubmit: string
  adminPasswordMismatch: string
  adminAlreadyRegistered: string
  userAccountLink: string
  authHubTitle: string
  adminSessionActiveHub: string
  adminGotoPanel: string
  userLoginTab: string
  userRegisterTab: string
  userNickname: string
  userPassword: string
  userPasswordAgain: string
  userLoginSubmit: string
  userRegisterSubmit: string
  userSwitchToRegister: string
  userSwitchToLogin: string
  userLogout: string
  /** Сумма очков по общим (live) раундам в БД */
  userLiveScoreTotal: (n: number) => string
  leaderboardMonthTitle: string
  leaderboardMonthLoading: string
  leaderboardMonthEmpty: string
  leaderboardMonthPts: (n: number) => string
  userLoggedInAs: (username: string) => string
  userWelcomeAuthed: string
  userContinueToGame: string
  userUsernameRules: string
  userLoginError: string
  userRegisterError: string
  userPasswordMismatch: string
  userUsernameTaken: string
  userBadUsername: string
  userBadPassword: string
}

const copy: Record<Locale, Copy> = {
  ru: {
    title: 'DayWord',
    subtitle: (n) =>
      `Настройте язык и длину (${n} букв). Затем — общий раунд (одно слово на всех, смена каждые 3 ч) или тренировка.`,
    playLive: 'Играть',
    playPractice: 'Тренировка',
    helpButton: 'Помощь',
    subtitleLive: (n) =>
      `Одно слово на всех, обновление каждые 3 часа. ${n} букв, 6 попыток.`,
    subtitlePractice: (n) => `Случайное слово только для вас. ${n} букв, 6 попыток.`,
    modeLiveBadge: 'Турнир',
    modePracticeBadge: 'Тренировка',
    liveRoundCountdownLabel: 'Новое слово через',
    newGameLive: 'Сбросить попытки',
    newGamePractice: 'Новое слово',
    languageLabel: 'Язык',
    lettersLabel: 'Букв в слове',
    themeLabel: 'Тема',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
    langRu: 'Русский',
    langEn: 'English',
    lettersN: (n) => `${n}`,
    boardAria: 'Игровое поле',
    keyboardAria: 'Экранная клавиатура',
    enterWordLength: (n) => `Введите слово из ${n} букв`,
    notInDictionary: 'Такого слова нет в словаре игры',
    alreadyUsed: 'Это слово уже было',
    hintPlaying: 'Введите слово и нажмите Enter',
    won: (word) => `Победа! Слово: ${word}`,
    lost: (word) => `Попытки закончились. Слово: ${word}`,
    enterKey: 'Enter',
    backspaceKey: 'Стереть',
    changeSettings: 'Настройки',
    exitGameScreen: 'Выйти',
    exitGameConfirmTitle: 'Выйти из игры?',
    exitGameConfirmHint:
      'Прогресс этой партии сохранится, вы вернётесь в меню. Продолжить выход?',
    exitGameConfirmStay: 'Остаться',
    exitGameConfirmLeave: 'Выйти',
    loadingGame: 'Загрузка слова из словаря…',
    loadFailed: 'Не удалось загрузить словарь. Проверьте API и БД.',
    retryLoad: 'Повторить',
    adminLink: 'Админ',
    suggestWord: 'Предложить это слово',
    suggestSent: 'Спасибо, слово отправлено на проверку',
    suggestDuplicate: 'Это слово уже в списке предложенных',
    suggestError: (code) => `Не удалось отправить (${code})`,
    adminTitle: 'Админ',
    adminLoginUser: 'Логин',
    adminLoginPass: 'Пароль',
    adminLoginSubmit: 'Войти',
    adminLoginError: 'Неверный логин или пароль',
    adminNotConfigured: 'Админка не настроена на сервере',
    adminLogout: 'Выйти',
    adminEmptyList: 'Нет предложенных слов',
    adminWord: 'Слово',
    adminLang: 'Язык',
    adminSuggestedAt: 'Когда',
    adminApprove: 'В словарь',
    adminDismiss: 'Отклонить',
    adminBackToGame: 'К игре',
    adminHome: 'Домой',
    adminLoadError: 'Ошибка загрузки',
    adminChangePasswordTitle: 'Смена пароля администратора',
    adminCurrentPassword: 'Текущий пароль',
    adminNewPassword: 'Новый пароль',
    adminChangePasswordSubmit: 'Сохранить пароль',
    adminPasswordChangeSuccess: 'Пароль обновлён.',
    adminWrongCurrentPassword: 'Неверный текущий пароль',
    adminBadNewPassword: 'Новый пароль: от 1 до 256 символов',
    adminPasswordChangeGenericError: 'Не удалось сменить пароль',
    adminSuggestionsTabsLabel: 'Язык списка предложений',
    adminEmptyListForLang: 'Для этого языка нет предложенных слов',
    adminConsoleMainTabsLabel: 'Раздел админки',
    adminTabSuggestions: 'Предложения',
    adminTabImport: 'Импорт слов',
    adminTabDictionary: 'Слова в базе',
    adminDictionarySectionLabel: 'Слова в игровом словаре',
    adminDictionaryLengthTabsLabel: 'Длина слова',
    adminDictionaryPrev: 'Назад',
    adminDictionaryNext: 'Вперёд',
    adminDictionaryRangePage: (from, to, total, page, totalPages) =>
      `${from}–${to} из ${total} · стр. ${page} / ${totalPages}`,
    adminDictionaryPaginationAria: 'Листание списка слов',
    adminDictionaryLettersAria: 'Перейти к первой букве',
    adminDictionaryAllLetters: 'Все',
    adminDictionarySearchLabel: 'Поиск',
    adminDictionarySearchPlaceholder: 'Часть или целое слово…',
    adminDictionarySearchSubmit: 'Найти',
    adminDictionarySearchClear: 'Сбросить',
    adminDictionarySearchAria: 'Поиск по списку слов',
    adminDictionaryEmpty: 'Нет слов этой длины для выбранного языка',
    adminDictionaryNoMatches: 'Ничего не найдено — измените букву или запрос',
    adminDictionaryEdit: 'Изменить',
    adminDictionarySave: 'Сохранить',
    adminDictionaryCancel: 'Отмена',
    adminDictionaryDelete: 'Удалить',
    adminDictionaryNewWordLabel: 'Новое слово',
    adminDictionaryErrorConflict: 'Такое слово уже есть в базе',
    adminDictionaryErrorNotFound: 'Слово не найдено (возможно, уже изменено)',
    adminDictionaryErrorBadLength: 'Длина должна быть от 4 до 6 букв',
    adminDictionaryErrorGeneric: 'Операция не выполнена',
    adminImportHint: 'По одному слову на строку (4–6 букв). Пустые строки учитываются в ошибках.',
    adminImportLangLabel: 'Язык словаря',
    adminImportTextLabel: 'Слова',
    adminImportPlaceholder: 'Вставьте список или выберите текстовый файл',
    adminImportFileButton: 'Загрузить из файла',
    adminImportFileHint: 'UTF-8, одно слово на строку',
    adminImportSubmit: 'Импортировать в словарь',
    adminImportSubmitting: 'Импорт…',
    adminImportResultTitle: 'Результат импорта',
    adminImportAddedTitle: (n) => `Добавлено (${n})`,
    adminImportAlreadyTitle: (n) => `Уже в базе (${n})`,
    adminImportInvalidTitle: (n) => `Ошибки (${n})`,
    adminImportNoReportYet: 'После импорта здесь отобразятся добавленные слова, дубликаты и ошибки.',
    adminImportTooManyLines: (max) => `Слишком много строк за один запрос (макс. ${max}).`,
    adminImportGenericError: 'Не удалось выполнить импорт',
    adminImportSourceDictionary: 'в словаре',
    adminImportSourceSuggested: 'на рассмотрении',
    adminImportSourceDismissed: 'отклонено',
    adminImportSourceUnknown: 'есть в базе',
    adminImportReasonEmpty: 'пустая строка',
    adminImportReasonBadLength: 'длина не 4–6 букв',
    adminImportReasonBadLine: 'некорректная строка',
    adminImportReasonInsertFailed: 'ошибка записи',
    adminCloseSettingsPanel: 'Свернуть настройки',
    adminEncryptionMissing:
      'На сервере не задан ADMIN_ENCRYPTION_KEY (64 hex-символа). Без ключа админка не работает.',
    adminFirstRunTitle: 'Первый вход: создайте администратора',
    adminFirstRunHint: 'Задайте логин и пароль администратора — поля не заполняются автоматически.',
    adminPasswordAgain: 'Пароль ещё раз',
    adminRegisterSubmit: 'Создать и войти',
    adminPasswordMismatch: 'Пароли не совпадают',
    adminAlreadyRegistered: 'Учётная запись уже создана — войдите',
    userAccountLink: 'Аккаунт',
    authHubTitle: 'Вход',
    adminSessionActiveHub: 'Сессия администратора активна.',
    adminGotoPanel: 'Панель предложений',
    userLoginTab: 'Вход',
    userRegisterTab: 'Регистрация',
    userNickname: 'Имя пользователя',
    userPassword: 'Пароль',
    userPasswordAgain: 'Пароль ещё раз',
    userLoginSubmit: 'Войти',
    userRegisterSubmit: 'Зарегистрироваться',
    userSwitchToRegister: 'Нет аккаунта? Зарегистрироваться',
    userSwitchToLogin: 'Уже есть аккаунт? Войти',
    userLogout: 'Выйти',
    userLiveScoreTotal: (n) => `· ${n} в зачёте`,
    leaderboardMonthTitle: 'Зачёт месяца (топ-3)',
    leaderboardMonthLoading: 'Загрузка лидерборда…',
    leaderboardMonthEmpty: 'Пока нет результатов',
    leaderboardMonthPts: (n) => `${n} очков`,
    userLoggedInAs: (username) => `Вы вошли как ${username}`,
    userWelcomeAuthed: 'Вы вошли в аккаунт.',
    userContinueToGame: 'К игре',
    userUsernameRules: '3–32 символа: латиница a–z, цифры, символ _',
    userLoginError: 'Неверное имя пользователя или пароль',
    userRegisterError: 'Не удалось зарегистрироваться',
    userPasswordMismatch: 'Пароли не совпадают',
    userUsernameTaken: 'Это имя уже занято',
    userBadUsername: 'Некорректное имя (см. подсказку ниже)',
    userBadPassword: 'Пароль: от 6 до 256 символов',
  },
  en: {
    title: 'DayWord',
    subtitle: (n) =>
      `Pick language and length (${n} letters). Then play the live round (same word for everyone, new every 3h) or practice.`,
    playLive: 'Play',
    playPractice: 'Practice',
    helpButton: 'Help',
    subtitleLive: (n) =>
      `Same word for everyone; new word every 3 hours. ${n} letters, 6 tries.`,
    subtitlePractice: (n) => `Random word just for you. ${n} letters, 6 tries.`,
    modeLiveBadge: 'Live round · 3h',
    modePracticeBadge: 'Practice',
    liveRoundCountdownLabel: 'Next word in',
    newGameLive: 'Clear attempts',
    newGamePractice: 'New word',
    languageLabel: 'Language',
    lettersLabel: 'Word length',
    themeLabel: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    langRu: 'Русский',
    langEn: 'English',
    lettersN: (n) => String(n),
    boardAria: 'Game board',
    keyboardAria: 'On-screen keyboard',
    enterWordLength: (n) => `Enter a ${n}-letter word`,
    notInDictionary: 'Not in game dictionary',
    alreadyUsed: 'Already used',
    hintPlaying: 'Type a word and press Enter',
    won: (word) => `You won! Word: ${word}`,
    lost: (word) => `Out of tries. Word: ${word}`,
    enterKey: 'Enter',
    backspaceKey: 'Backspace',
    changeSettings: 'Settings',
    exitGameScreen: 'Exit',
    exitGameConfirmTitle: 'Leave the game?',
    exitGameConfirmHint:
      'Your progress in this round is saved. You will return to the menu. Leave anyway?',
    exitGameConfirmStay: 'Stay',
    exitGameConfirmLeave: 'Exit',
    loadingGame: 'Loading word from dictionary…',
    loadFailed: 'Could not load dictionary. Check API and database.',
    retryLoad: 'Retry',
    adminLink: 'Admin',
    suggestWord: 'Suggest this word',
    suggestSent: 'Thanks — word submitted for review',
    suggestDuplicate: 'This word is already in the suggestion list',
    suggestError: (code) => `Could not submit (${code})`,
    adminTitle: 'Admin',
    adminLoginUser: 'Username',
    adminLoginPass: 'Password',
    adminLoginSubmit: 'Sign in',
    adminLoginError: 'Invalid username or password',
    adminNotConfigured: 'Admin is not configured on the server',
    adminLogout: 'Log out',
    adminEmptyList: 'No suggested words',
    adminWord: 'Word',
    adminLang: 'Language',
    adminSuggestedAt: 'When',
    adminApprove: 'Add to dictionary',
    adminDismiss: 'Dismiss',
    adminBackToGame: 'Back to game',
    adminHome: 'Home',
    adminLoadError: 'Load error',
    adminChangePasswordTitle: 'Change administrator password',
    adminCurrentPassword: 'Current password',
    adminNewPassword: 'New password',
    adminChangePasswordSubmit: 'Save password',
    adminPasswordChangeSuccess: 'Password updated.',
    adminWrongCurrentPassword: 'Current password is incorrect',
    adminBadNewPassword: 'New password: 1–256 characters',
    adminPasswordChangeGenericError: 'Could not change password',
    adminSuggestionsTabsLabel: 'Suggestion list language',
    adminEmptyListForLang: 'No suggested words for this language',
    adminConsoleMainTabsLabel: 'Admin section',
    adminTabSuggestions: 'Suggestions',
    adminTabImport: 'Import words',
    adminTabDictionary: 'Dictionary words',
    adminDictionarySectionLabel: 'Playable dictionary entries',
    adminDictionaryLengthTabsLabel: 'Word length',
    adminDictionaryPrev: 'Previous',
    adminDictionaryNext: 'Next',
    adminDictionaryRangePage: (from, to, total, page, totalPages) =>
      `${from}–${to} of ${total} · p. ${page} / ${totalPages}`,
    adminDictionaryPaginationAria: 'Dictionary list pagination',
    adminDictionaryLettersAria: 'Jump to first letter',
    adminDictionaryAllLetters: 'All',
    adminDictionarySearchLabel: 'Search',
    adminDictionarySearchPlaceholder: 'Part or whole word…',
    adminDictionarySearchSubmit: 'Find',
    adminDictionarySearchClear: 'Clear',
    adminDictionarySearchAria: 'Search dictionary list',
    adminDictionaryEmpty: 'No words of this length for the selected language',
    adminDictionaryNoMatches: 'No matches — try another letter or query',
    adminDictionaryEdit: 'Edit',
    adminDictionarySave: 'Save',
    adminDictionaryCancel: 'Cancel',
    adminDictionaryDelete: 'Delete',
    adminDictionaryNewWordLabel: 'New spelling',
    adminDictionaryErrorConflict: 'That word already exists in the database',
    adminDictionaryErrorNotFound: 'Word not found (it may have changed)',
    adminDictionaryErrorBadLength: 'Length must be 4–6 letters',
    adminDictionaryErrorGeneric: 'Operation failed',
    adminImportHint: 'One word per line (4–6 letters). Empty lines are reported as errors.',
    adminImportLangLabel: 'Dictionary language',
    adminImportTextLabel: 'Words',
    adminImportPlaceholder: 'Paste a list or pick a text file',
    adminImportFileButton: 'Load from file',
    adminImportFileHint: 'UTF-8, one word per line',
    adminImportSubmit: 'Import into dictionary',
    adminImportSubmitting: 'Importing…',
    adminImportResultTitle: 'Import result',
    adminImportAddedTitle: (n) => `Added (${n})`,
    adminImportAlreadyTitle: (n) => `Already in database (${n})`,
    adminImportInvalidTitle: (n) => `Errors (${n})`,
    adminImportNoReportYet: 'Run an import to see added words, duplicates, and errors.',
    adminImportTooManyLines: (max) => `Too many lines in one request (max ${max}).`,
    adminImportGenericError: 'Import failed',
    adminImportSourceDictionary: 'in dictionary',
    adminImportSourceSuggested: 'pending review',
    adminImportSourceDismissed: 'dismissed',
    adminImportSourceUnknown: 'in database',
    adminImportReasonEmpty: 'empty line',
    adminImportReasonBadLength: 'length not 4–6 letters',
    adminImportReasonBadLine: 'invalid line',
    adminImportReasonInsertFailed: 'write error',
    adminCloseSettingsPanel: 'Close settings',
    adminEncryptionMissing:
      'ADMIN_ENCRYPTION_KEY (64 hex chars) is not set on the server. Admin UI cannot run without it.',
    adminFirstRunTitle: 'First-time setup: create administrator',
    adminFirstRunHint: 'Choose an admin username and password — fields start empty.',
    adminPasswordAgain: 'Confirm password',
    adminRegisterSubmit: 'Create and sign in',
    adminPasswordMismatch: 'Passwords do not match',
    adminAlreadyRegistered: 'An account already exists — sign in instead',
    userAccountLink: 'Account',
    authHubTitle: 'Sign in',
    adminSessionActiveHub: 'Administrator session is active.',
    adminGotoPanel: 'Suggestion panel',
    userLoginTab: 'Sign in',
    userRegisterTab: 'Register',
    userNickname: 'Username',
    userPassword: 'Password',
    userPasswordAgain: 'Confirm password',
    userLoginSubmit: 'Sign in',
    userRegisterSubmit: 'Create account',
    userSwitchToRegister: 'No account? Register',
    userSwitchToLogin: 'Already have an account? Sign in',
    userLogout: 'Log out',
    userLiveScoreTotal: (n) => `· ${n} pts (live)`,
    leaderboardMonthTitle: 'Monthly leaderboard (top-3)',
    leaderboardMonthLoading: 'Loading leaderboard…',
    leaderboardMonthEmpty: 'No results yet',
    leaderboardMonthPts: (n) => `${n} pts`,
    userLoggedInAs: (username) => `Signed in as ${username}`,
    userWelcomeAuthed: 'You are signed in.',
    userContinueToGame: 'Back to game',
    userUsernameRules: '3–32 characters: a–z, digits, underscore',
    userLoginError: 'Wrong username or password',
    userRegisterError: 'Registration failed',
    userPasswordMismatch: 'Passwords do not match',
    userUsernameTaken: 'That username is already taken',
    userBadUsername: 'Invalid username (see hint below)',
    userBadPassword: 'Password: 6–256 characters',
  },
}

export function t(locale: Locale): Copy {
  return copy[locale]
}
