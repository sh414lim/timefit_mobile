enum AppEnvironment { development, staging, production }

extension AppEnvironmentValue on AppEnvironment {
  static AppEnvironment parse(String value) => switch (value.toLowerCase()) {
    'production' || 'prod' => AppEnvironment.production,
    'staging' || 'stage' => AppEnvironment.staging,
    _ => AppEnvironment.development,
  };

  String get label => switch (this) {
    AppEnvironment.development => 'Development',
    AppEnvironment.staging => 'Staging',
    AppEnvironment.production => 'Production',
  };
}
