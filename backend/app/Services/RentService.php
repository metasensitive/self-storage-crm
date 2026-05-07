<?php

namespace App\Services;

use App\Models\Rent;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class RentService
{
    public function createRent(array $data, int $userId): Rent
    {
        return DB::transaction(function () use ($data, $userId) {
            $unit = Unit::lockForUpdate()->findOrFail($data['unit_id']);

            $dateFrom = Carbon::parse($data['date_from'])->startOfDay();
            $dateTo = Carbon::parse($data['date_to'])->startOfDay();
            $days = $dateFrom->diffInDays($dateTo) + 1;

            $totalPrice = $data["price"] ?? ($unit->price * $days);

            $rent = Rent::create([
                'unit_id' => $unit->id,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'price' => $totalPrice,
                'status' => Rent::STATUS_ACTIVE,
            ]);

            $unit->update(['status' => Unit::STATUS_RENTED]);

            DB::afterCommit(fn() => Log::info('Аренда создана', [
                'user_id' => $userId,
                'rent_id' => $rent->id,
                'unit_id' => $unit->id,
                'date_from' => $dateFrom->toDateString(),
                'date_to' => $dateTo->toDateString(),
                'days' => $days,
                'price' => $totalPrice,
            ]));

            return $rent;
        });
    }

    public function finishRent(Rent $rent, int $userId): Rent
    {
        if ($rent->status !== Rent::STATUS_ACTIVE) {
            throw new InvalidArgumentException('Аренда уже завершена или отменена');
        }

        return DB::transaction(function () use ($rent, $userId) {
            $rent = Rent::lockForUpdate()->findOrFail($rent->id);

            $rent->update(['status' => Rent::STATUS_FINISHED]);

            $rent->unit()->update(['status' => Unit::STATUS_FREE]);

            DB::afterCommit(fn() => Log::info('Аренда завершена', [
                'user_id' => $userId,
                'rent_id' => $rent->id,
                'unit_id' => $rent->unit_id,
            ]));
            return $rent->fresh();
        });
    }
}
