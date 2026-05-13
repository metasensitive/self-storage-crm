<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\Location;
use App\Models\Rent;
use App\Models\Unit;
use Tests\TestCase;

class BulkActionsTest extends TestCase
{
    // ---- Units ----

    public function test_manager_cannot_bulk_update_unit_status(): void
    {
        $token = $this->managerToken();
        $this->postJson('/api/v1/units/bulk/status', [
            'ids' => [1],
            'status' => 'blocked',
        ], $this->authHeader($token))->assertStatus(403);
    }

    public function test_admin_bulk_updates_unit_status(): void
    {
        $token = $this->adminToken();
        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);
        $units = Unit::factory()->count(3)->create([
            'container_id' => $container->id,
            'status' => Unit::STATUS_FREE,
        ]);

        $response = $this->postJson('/api/v1/units/bulk/status', [
            'ids' => $units->pluck('id')->toArray(),
            'status' => 'blocked',
        ], $this->authHeader($token));

        $response->assertStatus(200)->assertJsonPath('data.updated_count', 3);
        foreach ($units as $u) {
            $this->assertSame('blocked', $u->fresh()->status);
        }
    }

    public function test_bulk_update_unit_status_validates_enum(): void
    {
        $token = $this->adminToken();
        $unit = Unit::factory()->create([
            'container_id' => Container::factory()->create([
                'location_id' => Location::factory()->create()->id,
            ])->id,
        ]);

        $this->postJson('/api/v1/units/bulk/status', [
            'ids' => [$unit->id],
            'status' => 'unknown_status',
        ], $this->authHeader($token))->assertStatus(422);
    }

    public function test_bulk_destroy_unit_skips_with_active_rent(): void
    {
        $token = $this->adminToken();
        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);
        $unitFree = Unit::factory()->create([
            'container_id' => $container->id,
            'status' => Unit::STATUS_FREE,
        ]);
        $unitRented = Unit::factory()->create([
            'container_id' => $container->id,
            'status' => Unit::STATUS_RENTED,
            'price' => 300,
        ]);
        Rent::factory()->create([
            'unit_id' => $unitRented->id,
            'status' => Rent::STATUS_ACTIVE,
            'date_from' => '2026-06-01',
            'date_to' => '2026-06-30',
            'price' => 9000,
        ]);

        $response = $this->deleteJson('/api/v1/units/bulk', [
            'ids' => [$unitFree->id, $unitRented->id],
        ], $this->authHeader($token));

        $response->assertStatus(200)
            ->assertJsonPath('data.deleted_count', 1)
            ->assertJsonPath('data.skipped.0.id', $unitRented->id);

        $this->assertNull(Unit::find($unitFree->id));
        $this->assertNotNull(Unit::find($unitRented->id));
    }

    // ---- Containers ----

    public function test_admin_bulk_updates_container_status(): void
    {
        $token = $this->adminToken();
        $location = Location::factory()->create();
        $containers = Container::factory()->count(2)->create([
            'location_id' => $location->id,
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/containers/bulk/status', [
            'ids' => $containers->pluck('id')->toArray(),
            'status' => 'maintenance',
        ], $this->authHeader($token));

        $response->assertStatus(200)->assertJsonPath('data.updated_count', 2);
        foreach ($containers as $c) {
            $this->assertSame('maintenance', $c->fresh()->status);
        }
    }

    public function test_bulk_destroy_container_skips_with_units(): void
    {
        $token = $this->adminToken();
        $location = Location::factory()->create();
        $empty = Container::factory()->create(['location_id' => $location->id]);
        $withUnits = Container::factory()->create(['location_id' => $location->id]);
        Unit::factory()->create(['container_id' => $withUnits->id]);

        $response = $this->deleteJson('/api/v1/containers/bulk', [
            'ids' => [$empty->id, $withUnits->id],
        ], $this->authHeader($token));

        $response->assertStatus(200)
            ->assertJsonPath('data.deleted_count', 1)
            ->assertJsonPath('data.skipped.0.id', $withUnits->id);

        $this->assertNull(Container::find($empty->id));
        $this->assertNotNull(Container::find($withUnits->id));
    }

    public function test_bulk_requires_at_least_one_id(): void
    {
        $token = $this->adminToken();
        $this->postJson('/api/v1/units/bulk/status', [
            'ids' => [],
            'status' => 'free',
        ], $this->authHeader($token))->assertStatus(422);
    }
}
