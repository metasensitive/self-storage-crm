<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Любой авторизованный — общий канал на изменения сущностей сети.
Broadcast::channel('app.changes', fn (User $user) => true);

// Только админ — канал журнала действий.
Broadcast::channel('admin.activity', fn (User $user) => $user->isAdmin());
