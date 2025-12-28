export class HttpErrorResponse extends Error {
  constructor(public error?: any, public status: number = 0) {
    super(typeof error === 'string' ? error : '');
  }
}
