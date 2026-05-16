<?php

use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Любой авторизованный — общий канал на изменения сущностей сети.
Broadcast::channel('app.changes', fn (User $user) => true);

// Только админ — канал журнала действий.
Broadcast::channel('admin.activity', fn (User $user) => $user->isAdmin());

// Только админ — общий канал поддержки (новые тикеты от менеджеров).
Broadcast::channel('support.admin', fn (User $user) => $user->isAdmin());

// Канал конкретного тикета — слышат админ и сам владелец тикета (менеджер).
Broadcast::channel('support.ticket.{ticketId}', function (User $user, int $ticketId) {
    if ($user->isAdmin()) {
        return true;
    }
    $ticket = SupportTicket::find($ticketId);
    return $ticket && (int) $ticket->manager_id === (int) $user->id;
});
