/* Forms that go to the parish office: [data-office-form="kind"]. */
import { maskPhone, t, validateForm } from '../lib/client';
import { submitOfficeForm } from '../lib/handlers';

export function initOfficeForms(scope: ParentNode = document, onDone?: (form: HTMLFormElement) => void) {
  scope.querySelectorAll<HTMLFormElement>('[data-office-form]').forEach((form) => {
    if (form.dataset.ready) return;
    form.dataset.ready = '1';
    form.querySelectorAll<HTMLInputElement>('[data-phone]').forEach(maskPhone);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector<HTMLElement>('[data-status]');
      if (!validateForm(form)) {
        if (status) status.textContent = t('formError');
        return;
      }
      const btn = form.querySelector<HTMLButtonElement>('[type=submit]');
      const label = btn?.textContent;
      if (btn) { btn.disabled = true; btn.textContent = t('sending'); }
      const data = Object.fromEntries(new FormData(form).entries());
      await submitOfficeForm(form.dataset.officeForm!, data);
      if (btn) { btn.disabled = false; btn.textContent = label!; }
      if (status) status.textContent = form.dataset.successKey ? t(form.dataset.successKey) : t('formSent');
      form.reset();
      onDone?.(form);
    });
  });
}
