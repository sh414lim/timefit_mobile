import 'package:flutter/material.dart';

class ActionRow extends StatelessWidget {
  const ActionRow({
    super.key,
    required this.title,
    required this.icon,
    this.description,
    this.trailing,
    this.onTap,
  });

  final String title;
  final IconData icon;
  final String? description;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
    leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
    title: Text(title, style: Theme.of(context).textTheme.titleMedium),
    subtitle: description == null ? null : Text(description!),
    trailing: trailing ?? const Icon(Icons.chevron_right_rounded),
    onTap: onTap,
  );
}
