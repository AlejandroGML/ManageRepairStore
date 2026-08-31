import { Component, Inject, inject } from '@angular/core';
import { SHARED_IMPORTS } from 'src/app/shared.imports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Client, Log } from 'src/app/interface/client';
import { ClientsApiService } from 'src/app/services/clients.api.service';
import { AdminApiService } from 'src/app/services/admin.api.service';
import { LoadingService } from 'src/app/services/loading.service';
import { AuthService } from 'src/app/services/auth.service';
import { SnackbarService } from 'src/app/services/snackbar.service';

@Component({
  selector: 'app-modal-delete-client',
  templateUrl: './modal-delete-client.component.html',
  standalone: true,
  imports: [SHARED_IMPORTS],
  styleUrls: ['./modal-delete-client.component.css']
})
export class ModalDeleteClientComponent {
  private readonly authService = inject(AuthService);

  constructor(private dialogRef: MatDialogRef<ModalDeleteClientComponent>,@Inject(MAT_DIALOG_DATA) public client: Client,
  private clientsApi:ClientsApiService, private adminApi:AdminApiService, private loadingService:LoadingService, private snackbarService:SnackbarService ) {
  }

  deleteClient(){
    this.loadingService.setLoading(true);

    setTimeout(async ()=>{
      this.clientsApi.deleteUserById(this.client.id!).subscribe(()=>{
        const currentUser = this.authService.getCurrentUser();
        const userName = currentUser?.name || currentUser?.email || 'Sistema';
        const log: Log = {
          userName: userName,
          clientId: this.client.id!,
          clientName: this.client.name,
          action: `eliminó`
        };
        this.loadingService.setLoading(false);
        this.adminApi.addLog(log).subscribe(()=>{});
        this.dialogRef.close(this.client.id);
      },error=>{
        this.loadingService.setLoading(false);
        this.snackbarService.openSnackBar('Error al eliminar. Intente nuevamente.');
        this.dialogRef.close(null);
      });
    },200);
  }

  close() {
    this.dialogRef.close(null);
  }
}
