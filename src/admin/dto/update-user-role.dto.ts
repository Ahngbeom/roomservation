import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/user.entity';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: '변경할 사용자 역할',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;
}
