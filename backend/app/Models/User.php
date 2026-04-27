<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
        'role',
    ];

    protected $hidden = [
      'password',
      'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // роли пользователей
    const ROLE_ADMIN = 'admin';
    const ROLE_MANAGER = 'manager';

    // проверка роли
    public function isAdmin() : bool
    {
        return $this->role() === self::ROLE_ADMIN;
    }
    public function isManager() : bool
    {
        return $this->role() === self::ROLE_MANAGER;
    }

    // получить url аватара
    public function getAvatarUrlAttribute(): ?string
    {
        if($this->avatar) {
            return asset('storage/' . $this->avatar);
        }
        return null;
    }
}
