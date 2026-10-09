/**
 * API pública de la feature Autenticación.
 * Todo lo que no se exporta aquí es un detalle interno (encapsulamiento).
 */
export { authCommands, authQueries } from './auth.container';
export { type AuthUser, hasRole, type Role } from './domain/auth';
export { AccountView } from './ui/components/account-view/account-view';
export { LoginForm } from './ui/components/login-form/login-form';
export { RegistrationFlow } from './ui/components/registration-flow/registration-flow';
export { UserMenu } from './ui/components/user-menu/user-menu';
export { useSession } from './ui/hooks/use-session';
