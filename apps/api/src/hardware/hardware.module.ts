import { Module } from '@nestjs/common';
import { HardwareDevicesService } from './hardware-devices.service.js';
import { HardwarePrinterService } from './hardware-printer.service.js';
import { HardwareController } from './hardware.controller.js';

@Module({
  controllers: [HardwareController],
  providers: [HardwareDevicesService, HardwarePrinterService],
  exports: [HardwareDevicesService, HardwarePrinterService],
})
export class HardwareModule {}
