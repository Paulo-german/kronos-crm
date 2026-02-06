import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { ChangePasswordSheet } from './change-password-sheet'

export function SecurityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Segurança</CardTitle>
        <CardDescription>
          Gerencie a segurança da sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Senha</p>
            <p className="text-sm text-muted-foreground">
              Altere sua senha de acesso.
            </p>
          </div>
          <ChangePasswordSheet />
        </div>
      </CardContent>
    </Card>
  )
}
