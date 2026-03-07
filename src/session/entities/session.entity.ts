import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('odoo_sessions')
export class OdooSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  accessToken: string;

  @Column()
  odooUrl: string;

  @Column()
  odooDb: string;

  @Column({ type: 'int' })
  odooUid: number;

  @Column()
  odooPasswordEncrypted: string;

  @Column({ type: 'varchar', nullable: true })
  userEmail: string | null;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
