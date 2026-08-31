import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity } from '../entities/client.entity';
import { ClientGroupEntity } from '../entities/client-group.entity';

@Injectable()
export class ClientService {
  constructor( 
    @InjectRepository(ClientEntity)
    private clientRepository: Repository<ClientEntity>,
    @InjectRepository(ClientGroupEntity)
    private groupRepository: Repository<ClientGroupEntity>,
  ) {}

  async getClientsByRut(rut: string): Promise<ClientEntity[]> {
    const clients: ClientEntity[] = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.rut_raw ILIKE :rut AND client.active = true', { rut: `%${rut}%` })
      .getMany();
    return clients;
  }

  async getAllUsers(): Promise<ClientEntity[]> {
    try {
      return await this.clientRepository.find(); 
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async getClientHierarchy(clientId: number): Promise<ClientEntity[]> {
    const client = await this.clientRepository.findOne({ where: { id: clientId } });
    if (!client) return [];
    const groupId = client.group_id;
    if (groupId == null) return [client];
    return this.clientRepository.find({ where: { group_id: groupId } } as any);
  }

  async getGroupClients(groupId: number): Promise<ClientEntity[]> {
    return this.clientRepository.find({ where: { group_id: groupId } } as any);
  }

  async getCountUsers(): Promise<number> {
    try {
      return await this.clientRepository.count(); 
    } catch (error) {
      console.log(error);
      return 0;
    }
  }

  async getUserById(id: number): Promise<ClientEntity | null> {
    return await this.clientRepository.findOne({where: {id:id,'active':true}});
  }

  async getUsersByName(name: string): Promise<ClientEntity[]> {
    const clients: ClientEntity[] = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.name ILIKE :name AND client.active = true', { name: `%${name}%` })
      .getMany();
    return clients;
  }

  async getUsersByAddress(address: string): Promise<ClientEntity[]> {
    const clients: ClientEntity[] = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.address ILIKE :address AND client.active = true', { address: `%${address}%` })
      .getMany();
    return clients;
  }
  async createUser(user: ClientEntity): Promise<ClientEntity> {
    if (!user.group) {
      if (user.rut_normalizado) {
        const existing = await this.groupRepository.findOne({
          where: { rut_normalizado: user.rut_normalizado },
        });
        user.group = existing || await this.groupRepository.save({
          rut_normalizado: user.rut_normalizado,
          name: user.name,
          active: true,
        });
      } else {
        user.group = await this.groupRepository.save({
          rut_normalizado: null,
          name: user.name,
          active: true,
        });
      }
    }
    return await this.clientRepository.save(user);
  }

  async updateUserById(id: number, newUser: ClientEntity): Promise<ClientEntity> {
    const userToUpdate = await this.clientRepository.findOne({where: {id:id,active:true}});
    if (!userToUpdate) {
      throw new Error(`User with id ${id} not found.`);
    }
    const updatedUser = Object.assign(userToUpdate, newUser);
    return await this.clientRepository.save(updatedUser);
  }

  async deleteUserById(id: number): Promise<void> {
    const userToDelete: ClientEntity | null = await this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.orders', 'orders')
      .where('client.id = :id', { id })
      .getOne();
    if (!userToDelete) {
      throw new Error(`User with id ${id} not found.`);
    }
    userToDelete.active = false;
    await this.clientRepository.save(userToDelete);
  }
}
