import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

class NetworkMonitor extends ChangeNotifier {
  NetworkMonitor({Connectivity? connectivity})
    : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _isOnline = true;

  bool get isOnline => _isOnline;

  Future<void> initialize() async {
    _setResults(await _connectivity.checkConnectivity());
    _subscription = _connectivity.onConnectivityChanged.listen(_setResults);
  }

  void _setResults(List<ConnectivityResult> results) {
    final next = results.any((result) => result != ConnectivityResult.none);
    if (_isOnline == next) return;
    _isOnline = next;
    notifyListeners();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
