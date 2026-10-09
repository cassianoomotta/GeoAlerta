import { expect, test } from '@playwright/test';
import { parseShelterInput, ShelterInputError } from '../../src/features/shelters/domain/input';
import { buildShelterDirections } from '../../src/features/shelters/domain/directions';
import { availableShelterPlaces, effectiveShelterStatus } from '../../src/features/shelters/domain/capacity';

const valid = {
  name: '  Ginásio Municipal  ',
  type: 'humano',
  address: '  Rua Exemplo, 100  ',
  lat: -29.79,
  lng: -50.52,
  capacity: 120,
  occupied: 30,
  phone: '  (51) 0000-0000 ',
  manager: '  Responsável  ',
  status: 'Aberto',
  isActive: true,
};

test('abrigo normaliza campos textuais e aceita coordenadas WGS84 válidas', () => {
  expect(parseShelterInput(valid)).toEqual({
    ...valid,
    name: 'Ginásio Municipal',
    address: 'Rua Exemplo, 100',
    phone: '(51) 0000-0000',
    manager: 'Responsável',
  });
});

test('abrigo aceita apenas tipo e situação operacional conhecidos', () => {
  for (const type of ['humano', 'pet', 'misto']) {
    expect(parseShelterInput({ ...valid, type }).type).toBe(type);
  }
  for (const status of ['Aberto', 'Lotado', 'Encerrado']) {
    expect(parseShelterInput({ ...valid, status }).status).toBe(status);
  }
  for (const value of [
    { ...valid, type: 'qualquer' },
    { ...valid, status: 'Fechado' },
  ]) expect(() => parseShelterInput(value)).toThrow(ShelterInputError);
});

test('abrigo exige nome, endereço, capacidade não negativa e localização completa', () => {
  for (const value of [
    { ...valid, name: '  ' },
    { ...valid, address: '  ' },
    { ...valid, capacity: -1 },
    { ...valid, occupied: -1 },
    { ...valid, capacity: 1.5 },
    { ...valid, lat: null },
    { ...valid, lng: null },
    { ...valid, lat: 90.01 },
    { ...valid, lng: -180.01 },
  ]) expect(() => parseShelterInput(value)).toThrow(ShelterInputError);
});

test('abrigo aceita links Google Maps e Waze com coordenadas e rejeita destino ambíguo', () => {
  expect(parseShelterInput({ ...valid, lat: null, lng: null, mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=-29.79%2C-50.52' })).toMatchObject({ lat: -29.79, lng: -50.52 });
  expect(parseShelterInput({ ...valid, lat: null, lng: null, mapUrl: 'https://waze.com/ul?ll=-29.79%2C-50.52&navigate=yes' })).toMatchObject({ lat: -29.79, lng: -50.52 });
  for (const value of [
    { ...valid, lat: null, lng: null, mapUrl: 'https://maps.app.goo.gl/short' },
    { ...valid, lat: null, lng: null, mapUrl: 'https://waze.com/ul?place=ChIJ-example' },
    { ...valid, lat: null, lng: null, mapUrl: 'https://attacker.example/maps/dir/?destination=-29.79,-50.52' },
    { ...valid, lat: null, lng: null, mapUrl: 'https://waze.com/ul?ll=-29.79,181' },
    { ...valid, mapUrl: 'https://waze.com/ul?ll=-29.8,-50.5' },
  ]) expect(() => parseShelterInput(value)).toThrow(ShelterInputError);
});

test('link curto Google Maps é aceito apenas junto de coordenadas válidas já informadas', () => {
  expect(parseShelterInput({ ...valid, mapUrl: 'https://maps.app.goo.gl/C3k4LN4jenqjj9Kz8' })).toMatchObject({ lat: -29.79, lng: -50.52 });
  expect(() => parseShelterInput({ ...valid, lat: null, lng: null, mapUrl: 'https://maps.app.goo.gl/C3k4LN4jenqjj9Kz8' })).toThrow(ShelterInputError);
  expect(() => parseShelterInput({ ...valid, mapUrl: 'https://attacker.example/C3k4LN4jenqjj9Kz8' })).toThrow(ShelterInputError);
});

test('vagas disponíveis nunca ficam negativas e a lotação acompanha ocupação e capacidade', () => {
  expect(availableShelterPlaces(200, 0)).toBe(200);
  expect(availableShelterPlaces(200, 75)).toBe(125);
  expect(availableShelterPlaces(200, 230)).toBe(0);
  expect(effectiveShelterStatus('Aberto', 200, 0)).toBe('Aberto');
  expect(effectiveShelterStatus('Aberto', 200, 200)).toBe('Lotado');
  expect(effectiveShelterStatus('Lotado', 200, 0)).toBe('Aberto');
  expect(effectiveShelterStatus('Encerrado', 200, 200)).toBe('Encerrado');
});

test('links de rota usam destino validado e coordenadas com precisão estável', () => {
  expect(buildShelterDirections(-29.79, -50.52)).toEqual({
    googleMaps: 'https://www.google.com/maps/dir/?api=1&destination=-29.79%2C-50.52',
    waze: 'https://waze.com/ul?ll=-29.79%2C-50.52&navigate=yes',
  });
  expect(() => buildShelterDirections(91, 0)).toThrow(ShelterInputError);
});
