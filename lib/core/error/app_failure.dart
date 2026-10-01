enum FailureKind {
  network,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validation,
  server,
  unknown,
}

class AppFailure implements Exception {
  const AppFailure(this.kind, this.message, {this.code, this.cause});
  final FailureKind kind;
  final String message;
  final String? code;
  final Object? cause;

  @override
  String toString() => 'AppFailure($kind, $code, $message)';
}
