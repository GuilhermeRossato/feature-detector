import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modals: any[] = [];

  /**
   * Add modal to array of active modals
   * @param modal
   */
  add(modal: any) {
    this.modals.push(modal);
  }

  /**
   * Remove modal from array of active modals
   * @param id The identifier (id parameter) of the modal
   */
  remove(id: string) {
    this.modals = this.modals.filter(x => x.id !== id);
  }

  /**
   * Open modal specified by id
   * @param id The identifier (id parameter) of the modal
   */
  open(id: string) {
    const modal = this.modals.find(x => x.id === id);
    if (!modal) {
      console.warn(`Modal identified by "${id}" was not found`);
      return;
    }
    modal.open();
  }

  /**
   * Close modal specified by id
   * @param id The identifier (id parameter) of the modal
   */
  close(id: string) {
    const modal = this.modals.find(x => x.id === id);
    modal.close();
  }
}
