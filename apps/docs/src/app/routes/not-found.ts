import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({ selector: 'lgr-not-found', changeDetection: ChangeDetectionStrategy.OnPush, imports: [RouterLink, MatButtonModule, MatIconModule], template: `<div class="lgr-page"><p class="lgr-eyebrow">404</p><h1>This documentation page does not exist</h1><p>The package catalog has every documented feature and its integration boundary.</p><a matButton="filled" routerLink="/packages"><mat-icon>inventory_2</mat-icon> Browse packages</a></div>` })
export class NotFound {}
